import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as SqlError from "effect/unstable/sql/SqlError";

import { DataConflictError, DsqlError, SchemaConflictError } from "../aws/dsql";
import { Constants } from "../utils/constants";
import { Drizzle } from "./drizzle";
import { pgCodeFromCause } from "./postgres";
import { Transaction } from "./transaction";

import type { AnyPgSelectQueryBuilder, PgSelectDynamic } from "drizzle-orm/pg-core";

export class QueryBuilderError extends Schema.TaggedErrorClass<QueryBuilderError>()(
  "QueryBuilderError",
  { cause: Schema.Defect },
) {}

export class Database extends Context.Service<Database>()("@printdesk/core/database/Database", {
  make: Effect.gen(function* () {
    const db = yield* Drizzle;

    const withTransaction = Effect.fn("Database.TransactionManager.withTransaction")(function* <
      TSuccess,
      TError,
      TServices,
    >(
      execute: (tx: typeof Transaction.Service.tx) => Effect.Effect<TSuccess, TError, TServices>,
      { retry = false }: { retry?: boolean } = {},
    ) {
      const transaction = db.transaction(execute).pipe(
        Effect.mapError((error) => {
          if (
            Predicate.isTagged(error, "SqlError") &&
            Predicate.isTagged(error.reason, "UnknownError")
          ) {
            const code = pgCodeFromCause(error.reason.cause);
            const message = Predicate.isError(error.reason.cause)
              ? error.reason.cause.message
              : undefined;

            if (code === DataConflictError.code || message?.includes(DataConflictError.code)) {
              return new DsqlError({
                reason: new DataConflictError(
                  error.reason.pipe(
                    Struct.pick(Struct.keys(Struct.omit(SqlError.UnknownError.fields, ["_tag"]))),
                  ),
                ),
              });
            }

            if (code === SchemaConflictError.code || message?.includes(SchemaConflictError.code)) {
              return new DsqlError({
                reason: new SchemaConflictError(
                  error.reason.pipe(
                    Struct.pick(Struct.keys(Struct.omit(SqlError.UnknownError.fields, ["_tag"]))),
                  ),
                ),
              });
            }
          }

          return error;
        }),
      );

      if (!retry) return yield* transaction;

      const schedule = Schedule.recurs(Constants.DB_TRANSACTION_MAX_RETRIES).pipe(
        Schedule.both(Schedule.exponential(Duration.millis(10))),
        Schedule.jittered,
        Schedule.reduce(() => 0, Number.increment), // repetitions
        Schedule.modifyDelay((attempt, delay) =>
          Effect.logInfo(
            `[Database]: Transaction attempt #${attempt + 1} failed, retrying again in ${delay.pipe(Duration.format)} ...`,
          ).pipe(Effect.as(delay)),
        ),
      );

      return yield* transaction.pipe(
        Effect.retry({
          while: (error) =>
            (Predicate.isTagged(error, "SqlError") || Predicate.isTagged(error, "DsqlError")) &&
            error.pipe(Struct.get("isRetryable")),
          schedule,
        }),
      );
    });

    const useTransaction = Effect.fn("Database.TransactionManager.useTransaction")(function* <
      TSuccess,
      TError,
      TServices,
    >(execute: (tx: typeof Transaction.Service.tx) => Effect.Effect<TSuccess, TError, TServices>) {
      return yield* Transaction.pipe(
        Effect.serviceOption,
        Effect.flatMap(
          Option.match({
            onSome: ({ tx }) => execute(tx),
            onNone: () => withTransaction(execute),
          }),
        ),
      );
    });

    const useQueryBuilder = Effect.fn("Database.TransactionManager.useQueryBuilder")(function* <
      TQueryBuilder extends AnyPgSelectQueryBuilder,
      TDynamic extends PgSelectDynamic<TQueryBuilder>,
    >(callback: (tx: typeof Transaction.Service.tx) => TDynamic) {
      const execute = (tx: typeof Transaction.Service.tx) =>
        Effect.try({
          try: () => callback(tx),
          catch: (cause) => new QueryBuilderError({ cause }),
        });

      return yield* Transaction.pipe(
        Effect.serviceOption,
        Effect.flatMap(
          Option.match({
            onSome: ({ tx }) => execute(tx),
            onNone: () => withTransaction(execute),
          }),
        ),
      );
    });

    const afterTransaction = Effect.fn("Database.TransactionManager.afterTransaction")(
      (effect: Effect.Effect<void>, { onSuccessOnly = true }: { onSuccessOnly?: boolean } = {}) =>
        Transaction.pipe(
          Effect.serviceOption,
          Effect.flatMap(
            Option.match({
              onSome: (transaction) => transaction.registerAfterEffect({ onSuccessOnly, effect }),
              onNone: () => effect,
            }),
          ),
        ),
    );

    return {
      withTransaction,
      useTransaction,
      useQueryBuilder,
      afterTransaction,
    } as const;
  }),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
