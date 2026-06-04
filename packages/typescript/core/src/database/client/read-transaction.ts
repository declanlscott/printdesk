import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

import type { ReadTransaction as ReplicacheReadTransaction } from "replicache";
import type { Models } from "../../models";

// @effect-leakable-service
export class ReadTransaction extends Context.Service<ReadTransaction, ReplicacheReadTransaction>()(
  "@printdesk/core/database/client/ReadTransaction",
) {}

export class ReadTransactionError extends Schema.TaggedErrorClass<ReadTransactionError>()(
  "ReadTransactionError",
  { cause: Schema.Defect() },
) {}

export class ReadTransactionManager extends Context.Service<ReadTransactionManager>()(
  "@printdesk/core/database/client/ReadTransactionManager",
  {
    make: Effect.sync(() => {
      const scan = <TTable extends Models.SyncTable>(table: TTable) =>
        ReadTransaction.pipe(
          Effect.flatMap((tx) =>
            Effect.tryPromise({
              try: () => tx.scan({ prefix: `${table.name}/` }).toArray(),
              catch: (cause) => new ReadTransactionError({ cause }),
            }),
          ),
          Effect.flatMap(
            Schema.decodeUnknownEffect<Schema.Decoder<ReadonlyArray<TTable["Dto"]["Type"]>>>(
              table.Dto.pipe(Schema.Array),
            ),
          ),
        );

      const get = <TTable extends Models.SyncTable>(
        table: TTable,
        id: TTable["Model"]["Type"]["id"],
      ) =>
        ReadTransaction.pipe(
          Effect.flatMap((tx) =>
            Effect.tryPromise({
              try: () => tx.get(`${table.name}/${id}`),
              catch: (cause) => new ReadTransactionError({ cause }),
            }),
          ),
          Effect.filterOrFail(Predicate.isNotUndefined, () => new Cause.NoSuchElementError()),
          Effect.flatMap(
            Schema.decodeUnknownEffect<Schema.Decoder<TTable["Dto"]["Type"]>>(table.Dto),
          ),
        );

      return { scan, get } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
