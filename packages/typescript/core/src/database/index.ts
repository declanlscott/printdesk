import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as SqlError from "effect/unstable/sql/SqlError";

import { Constants } from "../utils/constants";
import { Drizzle } from "./drizzle";
import { Transaction } from "./transaction";

import type { AnyPgSelectQueryBuilder, PgSelectDynamic } from "drizzle-orm/pg-core";

export class QueryBuilderError extends Schema.TaggedErrorClass<QueryBuilderError>()(
  "QueryBuilderError",
  { cause: Schema.Defect() },
) {}

export class Database extends Context.Service<Database>()("@printdesk/core/database/Database", {
  make: Effect.gen(function* () {
    const db = yield* Drizzle;

    const withTransaction = Effect.fn("Database.TransactionManager.withTransaction")(
      <TSuccess, TError, TServices>(
        execute: (tx: typeof Transaction.Service.tx) => Effect.Effect<TSuccess, TError, TServices>,
        { disableRetries = false }: { disableRetries?: boolean } = {},
      ) =>
        db.transaction(execute).pipe(
          Effect.retry(($) =>
            $(Schedule.recurs(Constants.DB_TRANSACTION_MAX_RETRIES)).pipe(
              Schedule.both(Schedule.exponential(Duration.millis(10))),
              Schedule.jittered,
              Schedule.while(
                Effect.fn(function* (metadata) {
                  const shouldRetry =
                    !disableRetries &&
                    SqlError.isSqlError(metadata.input) &&
                    metadata.input.isRetryable;

                  yield* Effect.log(
                    `[Database]: Transaction attempt #${metadata.attempt} failed, ${
                      shouldRetry
                        ? `retrying again in ${metadata.duration.pipe(Duration.format)}`
                        : "not retrying"
                    }:`,
                    Cause.fail(metadata.input),
                  );

                  return shouldRetry;
                }),
              ),
            ),
          ),
        ),
    );

    const useTransaction = Effect.fn("Database.TransactionManager.useTransaction")(
      <TSuccess, TError, TServices>(
        execute: (tx: typeof Transaction.Service.tx) => Effect.Effect<TSuccess, TError, TServices>,
      ) =>
        Transaction.pipe(
          Effect.serviceOption,
          Effect.flatMap(
            Option.match({
              onSome: ({ tx }) => execute(tx),
              onNone: () => withTransaction(execute),
            }),
          ),
        ),
    );

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
