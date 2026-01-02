import { drizzle } from "drizzle-orm/node-postgres";
import * as Cause from "effect/Cause";
import * as Chunk from "effect/Chunk";
import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import * as Runtime from "effect/Runtime";
import * as Schedule from "effect/Schedule";
import { DatabaseError, Pool } from "pg";

import { Signers } from "../aws";
import { Sst } from "../sst";
import { paginate } from "../utils";
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
      effect: Effect.gen(function* () {
        const runtime = yield* Effect.runtime();

        const logQuery: DrizzleLogger["logQuery"] = (query, params) =>
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

            yield* Effect.logInfo(`[Database]: Query: ${query}${paramsStr}`);
          }).pipe(Runtime.runSync(runtime));

        return { logQuery };
      }),
    },
  ) {}

  export class PoolError extends Data.TaggedError("PoolError")<{
    readonly cause: unknown;
  }> {}

  export class ConnectionTimeoutError extends Data.TaggedError(
    "ConnectionTimeoutError",
  ) {}

  export class TransactionError extends Data.TaggedError("TransactionError")<{
    readonly cause: unknown;
  }> {
    /**
     * Because Aurora DSQL uses REPEATABLE READ isolation level, we need to be prepared to retry transactions.
     *
     * See https://stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and,
     * https://www.postgresql.org/docs/10/errcodes-appendix.html, and
     * https://stackoverflow.com/a/16409293/749644
     */
    get isRetryable() {
      return (
        this.cause instanceof DatabaseError &&
        (this.cause.code ===
          Constants.POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
          this.cause.code === Constants.POSTGRES_DEADLOCK_DETECTED_ERROR_CODE)
      );
    }
  }

  export class Database extends Effect.Service<Database>()(
    "@printdesk/core/database/Database",
    {
      accessors: true,
      dependencies: [Logger.Default],
      scoped: Effect.gen(function* () {
        const dsqlCluster = yield* Sst.Resource.DsqlCluster.pipe(
          Effect.map(Redacted.value),
        );

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
                  Signers.Dsql.Signer.pipe(
                    Effect.flatMap((signer) =>
                      signer.getDbConnectAdminAuthToken(),
                    ),
                    Signers.Dsql.runtime.runSync,
                  ),
              }),
          ),
          (pool) => Effect.promise(() => pool.end()),
        );

        yield* Effect.tryPromise({
          try: () => pool.query("SELECT 1"),
          catch: (error) => new PoolError({ cause: error }),
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
              Effect.fail(new PoolError({ cause: error })).pipe(resume),
            );

            const abortListener = () =>
              Effect.fail(
                new PoolError({
                  cause: new globalThis.Error("Connection aborted"),
                }),
              ).pipe(resume);

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
            return Option.some(new TransactionError({ cause: error }));

          return Option.none();
        };

        const withTransaction = Effect.fn(
          "Database.TransactionManager.withTransaction",
        )(
          <TSuccess, TError, TContext>(
            execute: (
              tx: Transaction["tx"],
            ) => Effect.Effect<TSuccess, TError, TContext>,
            { retry = false }: { retry?: boolean } = {},
          ) =>
            Effect.gen(function* () {
              const runtime = yield* Effect.runtime<TContext>();

              const transaction = Effect.async<
                TSuccess,
                TError | TransactionError,
                TContext
              >((resume, signal) => {
                const abortListener = () =>
                  Effect.fail(
                    new TransactionError({
                      cause: new globalThis.Error("Transaction interrupted"),
                    }),
                  ).pipe(resume);

                signal.addEventListener("abort", abortListener);

                void db
                  .transaction((tx) =>
                    execute(tx).pipe(
                      Effect.provide(Transaction.Default(tx)),
                      Effect.timed,
                      Effect.flatMap(([duration, success]) =>
                        Effect.log(
                          `[Database]: Transaction completed successfully in ${duration.pipe(Duration.toMillis)}ms`,
                        ).pipe(Effect.as(success)),
                      ),
                      (transaction) =>
                        // Throws on any error so drizzle rolls back the transaction
                        Runtime.runPromise(runtime, transaction, { signal }),
                    ),
                  )
                  .then(Effect.succeed)
                  .catch((exception) => {
                    if (Runtime.isFiberFailure(exception)) {
                      const cause = exception[Runtime.FiberFailureCauseId];

                      // Propagate errors back into effect
                      if (Cause.isFailure(cause) && Cause.isFailType(cause)) {
                        const error = cause.error as TError;

                        return matchTxError(error).pipe(
                          Option.match({
                            onSome: Effect.fail,
                            onNone: () => Effect.fail(error),
                          }),
                        );
                      }

                      return Effect.die(cause);
                    }

                    return Effect.die(exception);
                  })
                  .then(resume);

                return Effect.sync(() =>
                  signal.removeEventListener("abort", abortListener),
                );
              });

              if (!retry) return yield* transaction;

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
                    Predicate.isTagged(error, "TransactionError") &&
                    error.isRetryable,
                  schedule,
                }),
              );
            }),
        );

        const useTransaction = Effect.fn(
          "Database.TransactionManager.useTransaction",
        )(<TReturn>(callback: (tx: Transaction["tx"]) => Promise<TReturn>) =>
          Effect.gen(function* () {
            const execute = (tx: Transaction["tx"]) =>
              Effect.async<TReturn, TransactionError>((resume, signal) => {
                const abortListener = () =>
                  Effect.fail(
                    new TransactionError({
                      cause: new globalThis.Error(
                        "Transaction execution interrupted",
                      ),
                    }),
                  ).pipe(resume);

                signal.addEventListener("abort", abortListener);

                Effect.tryPromise({
                  try: () => callback(tx),
                  catch: (error) =>
                    matchTxError(error).pipe(
                      Option.getOrElse(
                        () => new TransactionError({ cause: error }),
                      ),
                    ),
                }).pipe(resume);

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
                      `"useDynamic" called outside of transaction scope.`,
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

  export const paginateTransaction =
    (offset = 0) =>
    <TRow, TError, TContext>(
      self: Effect.Effect<ReadonlyArray<TRow>, TError, TContext>,
    ) =>
      self.pipe(
        paginate(
          Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT - Math.abs(offset),
        ),
      );
}
