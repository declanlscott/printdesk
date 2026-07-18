import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

import type {
  ReadTransaction as ReplicacheReadTransaction,
  WriteTransaction as ReplicacheWriteTransaction,
} from "replicache";
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
            Schema.decodeUnknownEffect<
              Schema.ConstraintDecoder<ReadonlyArray<TTable["Dto"]["Type"]>>
            >(table.Dto.pipe(Schema.Array)),
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
            Schema.decodeUnknownEffect<Schema.ConstraintDecoder<TTable["Dto"]["Type"]>>(table.Dto),
          ),
        );

      return { scan, get } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}

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
