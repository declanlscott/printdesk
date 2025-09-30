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

import { DsqlSigner } from "../aws2";
import { Sst } from "../sst";
import { Constants } from "../utils/constants";

import type {
  Logger as DrizzleLogger,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type {
  AnyPgSelectQueryBuilder,
  PgSelectDynamic,
  PgTransaction,
} from "drizzle-orm/pg-core";

export namespace Database {
  export class Logger extends Effect.Service<Logger>()(
    "@printdesk/core/database/Logger",
    {
      effect: Effect.runtime().pipe(
        Effect.map((runtime) => Runtime.runSync(runtime)),
        Effect.map(
          (runSync): DrizzleLogger => ({
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

  /**
   * Because Aurora DSQL uses REPEATABLE READ isolation level, we need to be prepared to retry transactions.
   *
   * See https://stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and,
   * https://www.postgresql.org/docs/10/errcodes-appendix.html, and
   * https://stackoverflow.com/a/16409293/749644
   */
  export class TransactionError extends Data.TaggedError(
    "@printdesk/core/database/TransactionError",
  )<{
    readonly cause: globalThis.Error | DatabaseError;
  }> {}

  export class Database extends Effect.Service<Database>()(
    "@printdesk/core/database/Database",
    {
      accessors: true,
      dependencies: [DsqlSigner.layer, Logger.Default],
      scoped: Effect.gen(function* () {
        const dsqlCluster = yield* Sst.Resource.DsqlCluster;
        const dsqlSigner = yield* DsqlSigner.Tag;

        const pool = yield* Effect.acquireRelease(
          Effect.sync(
            () =>
              new Pool({
                database: dsqlCluster.database,
                host: dsqlCluster.host,
                port: dsqlCluster.port,
                ssl: dsqlCluster.ssl,
                user: dsqlCluster.user,
                password: () =>
                  dsqlSigner
                    .getDbConnectAdminAuthToken()
                    .pipe(DsqlSigner.runtime.runSync),
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

        const logger = yield* Logger;
        const client = drizzle(pool, { logger, casing: "snake_case" });

        return {
          setupPoolListeners,
          client,
        } as const;
      }),
    },
  ) {}

  export const DatabaseLive = Layer.effectDiscard(
    Database.setupPoolListeners,
  ).pipe(Layer.provideMerge(Database.Default));

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
              afterEffectsRef.get.pipe(
                Effect.map(
                  Chunk.filterMap(({ onSuccessOnly, effect }) =>
                    onSuccessOnly && exit.pipe(Predicate.not(Exit.isSuccess))
                      ? Option.none()
                      : Option.some(effect),
                  ),
                ),
                Effect.flatMap(
                  Effect.allWith({
                    concurrency: "unbounded",
                    batching: true,
                    discard: true,
                  }),
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
      dependencies: [DatabaseLive],
      effect: Effect.gen(function* () {
        const db = yield* Database.client;

        const matchTxError = (error: unknown) => {
          if (
            error instanceof TransactionError &&
            error.cause instanceof DatabaseError
          )
            return matchTxError(error.cause);

          if (error instanceof DatabaseError)
            return new TransactionError({ cause: error });

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

              const transaction = Effect.async<
                TSuccess,
                TError | TransactionError,
                TContext
              >((resume, signal) => {
                db.transaction(async (tx) => {
                  const exit = await execute(tx).pipe(
                    Effect.provide(Transaction.Default(tx)),
                    Runtime.runPromiseExit(runtime),
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
                        cause: new globalThis.Error("Transaction interrupted"),
                      }),
                    ),
                  );

                signal.addEventListener("abort", abortListener);

                return Effect.sync(() =>
                  signal.removeEventListener("abort", abortListener),
                );
              });

              if (!shouldRetry) return yield* transaction;

              const schedule = Schedule.recurs(
                Constants.DB_TRANSACTION_MAX_RETRIES,
              ).pipe(
                Schedule.intersect(Schedule.exponential(Duration.millis(10))),
                Schedule.jittered,
                Schedule.repetitions,
                Schedule.modifyDelayEffect((attempt, delay) =>
                  Effect.logInfo(
                    `[Database]: Transaction attempt #${attempt + 1} failed, retrying again in ${delay.pipe(Duration.format)} ...`,
                  ).pipe(Effect.as(delay)),
                ),
              );

              return yield* transaction.pipe(
                Effect.retry({
                  while: (error) =>
                    Predicate.isTagged(
                      error,
                      "@printdesk/core/database/TransactionError",
                    ) &&
                    error.cause instanceof DatabaseError &&
                    (error.cause.code ===
                      Constants.POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
                      error.cause.code ===
                        Constants.POSTGRES_DEADLOCK_DETECTED_ERROR_CODE),
                  schedule,
                }),
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

        const useDynamic = Effect.fn("Database.TransactionManager.useDynamic")(
          <
            TQueryBuilder extends AnyPgSelectQueryBuilder,
            TDynamic extends PgSelectDynamic<TQueryBuilder>,
          >(
            callback: (tx: Transaction["tx"]) => TDynamic,
          ) =>
            Effect.serviceOption(Transaction).pipe(
              Effect.flatMap(
                Option.match({
                  onSome: ({ tx }) => Effect.succeed(callback(tx)),
                  onNone: () =>
                    Effect.dieMessage(
                      `"useDynamic" called outside of transaction scope`,
                    ),
                }),
              ),
            ),
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

        return {
          withTransaction,
          useTransaction,
          useDynamic,
          afterTransaction,
        } as const;
      }),
    },
  ) {}
}
