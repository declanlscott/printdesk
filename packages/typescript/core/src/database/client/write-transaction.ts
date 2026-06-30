import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { ReadTransactionManager } from "./read-transaction";

import type { WriteTransaction as ReplicacheWriteTransaction } from "replicache";
import type { Models } from "../../models";

// @effect-leakable-service
export class WriteTransaction extends Context.Service<
  WriteTransaction,
  ReplicacheWriteTransaction
>()("@printdesk/core/database/client/WriteTransaction") {}

export class WriteTransactionError extends Schema.TaggedErrorClass<WriteTransactionError>()(
  "WriteTransactionError",
  { cause: Schema.Defect() },
) {}

export class WriteTransactionManager extends Context.Service<WriteTransactionManager>()(
  "@printdesk/core/database/client/WriteTransactionManager",
  {
    make: Effect.gen(function* () {
      const { get } = yield* ReadTransactionManager;

      const set = <TTable extends Models.SyncTable>(
        table: TTable,
        id: TTable["Dto"]["Type"]["id"],
        value: TTable["Dto"]["Type"],
      ) =>
        Effect.succeed(value).pipe(
          Effect.flatMap(
            Schema.encodeEffect<Schema.ConstraintEncoder<TTable["Dto"]["Encoded"]>>(table.Dto),
          ),
          Effect.tap((encoded) =>
            WriteTransaction.pipe(
              Effect.flatMap((tx) =>
                Effect.tryPromise({
                  try: () => tx.set(`${table.name}/${id}`, encoded),
                  catch: (cause) => new WriteTransactionError({ cause }),
                }),
              ),
            ),
          ),
          Effect.andThen(() => get(table, id)),
        );

      const del = <TTable extends Models.SyncTable>(
        table: TTable,
        id: TTable["Dto"]["Type"]["id"],
      ) =>
        get(table, id).pipe(
          Effect.tap(() =>
            WriteTransaction.pipe(
              Effect.flatMap((tx) =>
                Effect.tryPromise({
                  try: () => tx.del(`${table.name}${id}`),
                  catch: (cause) => new WriteTransactionError({ cause }),
                }),
              ),
            ),
          ),
        );

      return { set, del } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
