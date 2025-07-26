import { TransactionRollbackError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  Cause,
  Chunk,
  Data,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Predicate,
  Ref,
  Runtime,
  Schedule,
} from "effect";
import { DatabaseError, Pool } from "pg";

import { Dsql } from "../aws2";
import { Sst } from "../sst";
import { Constants } from "../utils/constants";

import type { ExtractTablesWithRelations, Logger } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";

export namespace Database {
  export class ClientLogger extends Effect.Service<ClientLogger>()(
    "@printdesk/core/database/ClientLogger",
    {
      effect: Effect.runtime().pipe(
        Effect.map((runtime) => Runtime.runSync(runtime)),
        Effect.map(
          (runSync): Logger => ({
            logQuery: (query, params) =>
              runSync(
                Effect.gen(function* () {
                  const stringifiedParams = params.map((p) => {
                    try {
                      return JSON.stringify(p);
                    } catch {
                      return String(p);
                    }
                  });

                  const paramsStr = stringifiedParams.length
                    ? ` -- params: [${stringifiedParams.join(", ")}]`
                    : "";

                  yield* Effect.logInfo(
                    `[Database]: Query: ${query}${paramsStr}`,
                  );
                }),
              ),
          }),
        ),
      ),
    },
  ) {}

  export class PoolError extends Data.TaggedError(
    "@printdesk/core/database/PoolError",
  )<{ readonly cause: globalThis.Error }> {}

  export class ConnectionTimeoutError extends Data.TaggedError(
    "@printdesk/core/database/ConnectionTimeoutError",
  ) {}

  export class TransactionError extends Data.TaggedError(
    "@printdesk/core/database/TransactionError",
  )<{
    /**
     * Because Aurora DSQL uses REPEATABLE READ isolation level, we need to be prepared to retry transactions.
     *
     * See https://stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and,
     * https://www.postgresql.org/docs/10/errcodes-appendix.html, and
     * https://stackoverflow.com/a/16409293/749644
     */
    readonly shouldRetry: boolean;
    readonly cause: globalThis.Error;
  }> {}

  export class Database extends Effect.Service<Database>()(
    "@printdesk/core/database/Database",
    {
      accessors: true,
      dependencies: [
        Layer.unwrapEffect(
          Effect.gen(function* () {
            const dsqlCluster = yield* Sst.Resource.DsqlCluster;
            const aws = yield* Sst.Resource.Aws;

            return Dsql.Signer.Default({
              hostname: dsqlCluster.host,
              region: aws.region,
            });
          }),
        ).pipe(Layer.provideMerge(Sst.Resource.layer)),
        ClientLogger.Default,
      ],
      scoped: Effect.gen(function* () {
        const dsqlCluster = yield* Sst.Resource.DsqlCluster;
        const dsqlSigner = yield* Dsql.Signer;

        const pool = yield* Effect.acquireRelease(
          Effect.sync(
            () =>
              new Pool({
                database: dsqlCluster.database,
                host: dsqlCluster.host,
                port: dsqlCluster.port,
                ssl: dsqlCluster.ssl,
                user: dsqlCluster.user,
                password: () => dsqlSigner.getDbConnectAdminAuthToken(),
              }),
          ),
          (pool) => Effect.promise(() => pool.end()),
        );

        yield* Effect.tryPromise({
          try: () => pool.query("SELECT 1"),
          catch: (error) =>
            new PoolError({
              cause:
                error instanceof globalThis.Error
                  ? error
                  : new globalThis.Error("Unknown error", { cause: error }),
            }),
        }).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(5),
            onTimeout: () => new ConnectionTimeoutError(),
          }),
          Effect.tap(() =>
            Effect.logInfo("[Database]: Client connection established."),
          ),
        );

        const setupPoolListeners = Effect.async<void, PoolError>(
          (resume, signal) => {
            pool.on("error", (error) =>
              resume(Effect.fail(new PoolError({ cause: error }))),
            );

            const abortListener = () =>
              resume(
                Effect.fail(
                  new PoolError({
                    cause: new globalThis.Error("Connection interrupted"),
                  }),
                ),
              );

            signal.addEventListener("abort", abortListener);

            return Effect.sync(() => {
              pool.removeAllListeners("error");
              signal.removeEventListener("abort", abortListener);
            });
          },
        );

        const logger = yield* ClientLogger;
        const client = drizzle(pool, { logger });

        return {
          setupPoolListeners,
          client,
        } as const;
      }),
    },
  ) {}

  export interface AfterEffect {
    onSuccessOnly: boolean;
    effect: Effect.Effect<void>;
  }

  export class Transaction extends Effect.Service<Transaction>()(
    "@printdesk/core/database/Transaction",
    {
      scoped: (
        tx: PgTransaction<
          NodePgQueryResultHKT,
          Record<string, never>,
          ExtractTablesWithRelations<Record<string, never>>
        >,
      ) =>
        Effect.gen(function* () {
          const afterEffectsRef = yield* Ref.make(Chunk.empty<AfterEffect>());

          yield* Effect.addFinalizer(
            Effect.fn("Database.Transaction.finalizer")((exit) =>
              afterEffectsRef.pipe(
                Ref.get,
                Effect.map(
                  Chunk.filterMap(({ onSuccessOnly, effect }) =>
                    onSuccessOnly && exit.pipe(Predicate.not(Exit.isSuccess))
                      ? Option.none()
                      : Option.some(effect),
                  ),
                ),
                Effect.flatMap(
                  Effect.allWith({ concurrency: "unbounded", discard: true }),
                ),
              ),
            ),
          );

          const registerAfterEffect = (afterEffect: AfterEffect) =>
            afterEffectsRef.pipe(Ref.update(Chunk.append(afterEffect)));

          return { tx, registerAfterEffect } as const;
        }),
    },
  ) {}

  export class TransactionManager extends Effect.Service<TransactionManager>()(
    "@printdesk/core/database/TransactionManager",
    {
      dependencies: [Database.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.client;

        const matchTxError = (error: unknown) => {
          if (
            error instanceof TransactionError &&
            error.cause instanceof DatabaseError
          )
            return matchTxError(error.cause);

          if (error instanceof DatabaseError)
            return new TransactionError({
              shouldRetry:
                error.code ===
                  Constants.POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
                error.code === Constants.POSTGRES_DEADLOCK_DETECTED_ERROR_CODE,
              cause: error,
            });

          return null;
        };

        const withTransaction = Effect.fn(
          "Database.TransactionManager.withTransaction",
        )(
          <TSuccess, TError, TContext>(
            execute: (
              tx: Transaction["tx"],
            ) => Effect.Effect<TSuccess, TError, TContext>,
            { shouldRetry = false }: { shouldRetry?: boolean } = {},
          ) =>
            Effect.gen(function* () {
              const runtime = yield* Effect.runtime<TContext>();
              const runPromiseExit = Runtime.runPromiseExit(runtime);

              const transaction = Effect.async<
                TSuccess,
                TError | TransactionError,
                TContext
              >((resume, signal) => {
                db.transaction(async (tx) => {
                  const exit = await execute(tx).pipe(
                    Effect.provide(Transaction.Default(tx)),
                    runPromiseExit,
                  );

                  Exit.match(exit, {
                    onSuccess: (success) => resume(Effect.succeed(success)),
                    onFailure: (cause) => {
                      if (cause.pipe(Cause.isFailure)) {
                        const ogError = cause.pipe(Cause.originalError);
                        const txError = ogError.pipe(matchTxError);

                        resume(Effect.fail(txError ?? (ogError as TError)));
                      } else resume(Effect.die(cause));
                    },
                  });
                }).catch((error) => {
                  const txError = matchTxError(error);

                  resume(txError ? Effect.fail(txError) : Effect.die(error));
                });

                const abortListener = () =>
                  resume(
                    Effect.fail(
                      new TransactionError({
                        shouldRetry: false,
                        cause: new globalThis.Error("Transaction interrupted"),
                      }),
                    ),
                  );

                signal.addEventListener("abort", abortListener);

                return Effect.sync(() =>
                  signal.removeEventListener("abort", abortListener),
                );
              });

              if (!shouldRetry)
                return yield* transaction.pipe(
                  Effect.catchTag(
                    "@printdesk/core/database/TransactionError",
                    (error) => Effect.fail({ ...error, shouldRetry }),
                  ),
                );

              const schedule = Schedule.recurs(
                Constants.DB_TRANSACTION_MAX_RETRIES,
              ).pipe(
                Schedule.intersect(Schedule.exponential(Duration.millis(10))),
                Schedule.jittered,
                Schedule.modifyDelayEffect(([attempt], delay) =>
                  Effect.succeed(delay).pipe(
                    Effect.tap(() =>
                      Effect.logInfo(
                        `[Database]: Transaction attempt #${
                          attempt + 1
                        } failed, retrying again in ${Duration.toMillis(
                          delay,
                        )}ms ...`,
                      ),
                    ),
                  ),
                ),
              );

              return yield* Effect.retry(transaction, {
                while: (error) =>
                  Predicate.isTagged(
                    error,
                    "@printdesk/core/database/TransactionError",
                  ) && Predicate.isTruthy(error.shouldRetry),
                schedule,
              }).pipe(
                Effect.catchTag(
                  "@printdesk/core/database/TransactionError",
                  (error) =>
                    Effect.fail({ ...error, shouldRetry: false } as const).pipe(
                      Effect.tapError((error) =>
                        Effect.logError(
                          `[Database]: Failed to execute transaction after maximum number of retries, giving up.`,
                          error,
                        ),
                      ),
                    ),
                ),
              );
            }),
        );

        const useTransaction = Effect.fn(
          "Database.TransactionManager.useTransaction",
        )(<TReturn>(callback: (tx: Transaction["tx"]) => Promise<TReturn>) =>
          Effect.gen(function* () {
            const execute = (...params: Parameters<typeof callback>) =>
              Effect.async<TReturn, TransactionError>((resume, signal) => {
                const abortListener = () =>
                  resume(
                    Effect.fail(
                      new TransactionError({
                        shouldRetry: false,
                        cause: new TransactionRollbackError(),
                      }),
                    ),
                  );

                signal.addEventListener("abort", abortListener);

                resume(
                  Effect.tryPromise({
                    try: () => callback(...params),
                    catch: (error) =>
                      matchTxError(error) ??
                      new TransactionError({
                        shouldRetry: false,
                        cause:
                          error instanceof globalThis.Error
                            ? error
                            : new globalThis.Error("Unknown error", {
                                cause: error,
                              }),
                      }),
                  }),
                );

                return Effect.sync(() =>
                  signal.removeEventListener("abort", abortListener),
                );
              });

            return yield* Effect.serviceOption(Transaction).pipe(
              Effect.flatMap(
                Option.match({
                  onSome: ({ tx }) => execute(tx),
                  onNone: () => withTransaction(execute),
                }),
              ),
            );
          }),
        );

        const afterTransaction = Effect.fn(
          "Database.TransactionManager.afterTransaction",
        )(
          (
            effect: Effect.Effect<void>,
            { onSuccessOnly = true }: { onSuccessOnly?: boolean } = {},
          ) =>
            Effect.serviceOption(Transaction).pipe(
              Effect.flatMap(
                Option.match({
                  onSome: (transaction) =>
                    transaction.registerAfterEffect({
                      onSuccessOnly,
                      effect,
                    }),
                  onNone: () => effect,
                }),
              ),
            ),
        );

        return { withTransaction, useTransaction, afterTransaction } as const;
      }),
    },
  ) {}
}
