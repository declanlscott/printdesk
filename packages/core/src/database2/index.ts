import { TransactionRollbackError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  Cause,
  Context,
  Data,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Predicate,
  Runtime,
  Schedule,
  Scope,
} from "effect";
import { DatabaseError, Pool } from "pg";

import { Dsql } from "../aws2";
import { Sst } from "../sst";
import { Constants } from "../utils/constants";
import * as schema from "./schema";

import type {
  Logger as ClientLoggerShape,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import type {
  NodePgDatabase,
  NodePgQueryResultHKT,
} from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";

export namespace Database {
  const makeClientLogger = Effect.runtime().pipe(
    Effect.map((runtime) => Runtime.runSync(runtime)),
    Effect.map((runSync) =>
      ClientLogger.of({
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

              yield* Effect.logInfo(`Query: ${query}${paramsStr}`);
            }),
          ),
      }),
    ),
  );

  export class ClientLogger extends Effect.Tag(
    "@printdesk/core/database/ClientLogger",
  )<ClientLogger, ClientLoggerShape>() {
    static live = Layer.effect(this, makeClientLogger);
  }

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

  export interface TransactionShape {
    tx: PgTransaction<
      NodePgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;
  }

  export class Transaction extends Context.Tag(
    "@printdesk/core/database/Transaction",
  )<Transaction, TransactionShape>() {}

  const matchTxError = (error: unknown) => {
    if (
      error instanceof TransactionError &&
      error.cause instanceof DatabaseError
    )
      return matchTxError(error.cause);

    if (error instanceof DatabaseError)
      return new TransactionError({
        shouldRetry:
          error.code === Constants.POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
          error.code === Constants.POSTGRES_DEADLOCK_DETECTED_ERROR_CODE,
        cause: error,
      });

    return null;
  };

  const makeDatabase = Effect.gen(function* () {
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
    const client = drizzle(pool, { schema, logger });

    const withTransaction = Effect.fn("Database.Database.withTransaction")(
      <TSuccess, TError, TRequirements>(
        makeTransaction: (
          tx: TransactionShape["tx"],
        ) => Effect.Effect<TSuccess, TError, TRequirements>,
      ) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<TRequirements>();
          const runPromiseExit = Runtime.runPromiseExit(runtime);

          const transaction = Effect.async<
            TSuccess,
            TError | TransactionError,
            TRequirements
          >((resume, signal) => {
            client
              .transaction(async (tx) => {
                const exit = await makeTransaction(tx).pipe(
                  Effect.provideService(Transaction, Transaction.of({ tx })),
                  Effect.scoped,
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
              })
              .catch((error) => {
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

    const useTransaction = Effect.fn("Database.Database.useTransaction")(
      <TReturn>(callback: (tx: TransactionShape["tx"]) => Promise<TReturn>) =>
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

    const afterTransaction = Effect.fn("Database.Database.afterTransaction")(
      <TRequirements>(
        afterEffect: Effect.Effect<void, never, TRequirements>,
        { onSuccessOnly = true }: { onSuccessOnly?: boolean } = {},
      ) =>
        Effect.gen(function* () {
          const addFinalizer = Effect.addFinalizer((exit) =>
            Effect.gen(function* () {
              if (onSuccessOnly && exit.pipe(Exit.isFailure)) return;

              yield* afterEffect;
            }),
          );

          yield* Effect.serviceOption(Scope.Scope).pipe(
            Effect.flatMap(
              Option.match({
                onSome: (scope) => addFinalizer.pipe(Scope.extend(scope)),
                onNone: () => addFinalizer.pipe(Effect.scoped),
              }),
            ),
          );
        }),
    );

    return Database.of({
      setupPoolListeners,
      client,
      withTransaction,
      useTransaction,
      afterTransaction,
    });
  });

  export interface DatabaseShape {
    setupPoolListeners: Effect.Effect<void, PoolError>;
    client: NodePgDatabase<typeof schema> & {
      $client: Pool;
    };
    withTransaction: <TSuccess, TError, TRequirements>(
      makeTransaction: (
        tx: TransactionShape["tx"],
      ) => Effect.Effect<TSuccess, TError, TRequirements>,
    ) => Effect.Effect<TSuccess, TError | TransactionError, TRequirements>;
    useTransaction: <TReturn>(
      callback: (tx: TransactionShape["tx"]) => Promise<TReturn>,
    ) => Effect.Effect<TReturn, TransactionError>;
    afterTransaction: <TRequirements>(
      afterEffect: Effect.Effect<void, never, TRequirements>,
      options?: {
        onSuccessOnly?: boolean;
      },
    ) => Effect.Effect<void, never, TRequirements>;
  }

  export class Database extends Effect.Tag("@printdesk/core/database/Database")<
    Database,
    DatabaseShape
  >() {
    static live = Layer.effect(this, makeDatabase).pipe(
      Layer.provide(ClientLogger.live),
    );
  }
}
