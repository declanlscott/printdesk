import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Schema from "effect/Schema";

import type * as Option from "effect/Option";
import type {
  ReadTransaction as ReadTx,
  WriteTransaction as WriteTx,
} from "replicache";
import type { Models } from "../models";

export namespace Database {
  // @effect-leakable-service
  export class ReadTransaction extends Context.Tag(
    "@printdesk/core/database/client/ReadTransaction",
  )<ReadTransaction, ReadTx>() {}

  export class ReadTransactionError extends Data.TaggedError(
    "ReadTransactionError",
  )<{ readonly cause: unknown }> {}

  export class ReadTransactionManager extends Effect.Service<ReadTransactionManager>()(
    "@printdesk/core/database/client/ReadTransactionManager",
    {
      sync: () => {
        const scan = <TTable extends Models.SyncTable>(table: TTable) =>
          ReadTransaction.pipe(
            Effect.flatMap((tx) =>
              Effect.tryPromise({
                try: () => tx.scan({ prefix: `${table.name}/` }).toArray(),
                catch: (cause) => new ReadTransactionError({ cause }),
              }),
            ),
            Effect.flatMap(
              Schema.decodeUnknown<
                ReadonlyArray<TTable["DataTransferObject"]["Type"]>,
                ReadonlyArray<TTable["DataTransferObject"]["Encoded"]>,
                never
              >(table.DataTransferObject.pipe(Schema.Array)),
            ),
          );

        const get = <TTable extends Models.SyncTable>(
          table: TTable,
          id: TTable["DataTransferObject"]["Type"]["id"],
        ) =>
          Effect.gen(function* () {
            const tx = yield* ReadTransaction;

            const value = yield* Effect.tryPromise({
              try: () => tx.get(`${table.name}/${id}`),
              catch: (cause) => new ReadTransactionError({ cause }),
            });
            if (!value) return yield* new Cause.NoSuchElementException();

            return yield* pipe(
              value,
              Schema.decodeUnknown<
                TTable["DataTransferObject"]["Type"],
                TTable["DataTransferObject"]["Encoded"],
                never
              >(table.DataTransferObject.pipe(Schema.asSchema)),
            );
          });

        return { scan, get } as const;
      },
    },
  ) {}

  // @effect-leakable-service
  export class WriteTransaction extends Context.Tag(
    "@printdesk/core/database/client/WriteTransaction",
  )<WriteTransaction, WriteTx>() {}

  export class WriteTransactionError extends Data.TaggedError(
    "WriteTransactionError",
  )<{ readonly cause: unknown }> {}

  export class WriteTransactionManager extends Effect.Service<WriteTransactionManager>()(
    "@printdesk/core/database/client/WriteTransactionManager",
    {
      dependencies: [ReadTransactionManager.Default],
      effect: Effect.gen(function* () {
        const { get } = yield* ReadTransactionManager;

        const set = <TTable extends Models.SyncTable>(
          table: TTable,
          id: TTable["DataTransferObject"]["Type"]["id"],
          value: TTable["DataTransferObject"]["Type"],
        ) =>
          Effect.succeed(value).pipe(
            Effect.flatMap(
              Schema.encode<
                TTable["DataTransferObject"]["Type"],
                TTable["DataTransferObject"]["Encoded"],
                never
              >(table.DataTransferObject.pipe(Schema.asSchema)),
            ),
            Effect.flatMap((encoded) =>
              WriteTransaction.pipe(
                Effect.flatMap((tx) =>
                  Effect.tryPromise({
                    try: () => tx.set(`${table.name}/${id}`, encoded),
                    catch: (cause) => new WriteTransactionError({ cause }),
                  }),
                ),
              ),
            ),
            Effect.andThen(get(table, id)),
          );

        const del = <TTable extends Models.SyncTable>(
          table: TTable,
          id: TTable["DataTransferObject"]["Type"]["id"],
        ) =>
          Effect.zipLeft(
            get(table, id),
            WriteTransaction.pipe(
              Effect.flatMap((tx) =>
                Effect.tryPromise({
                  try: () => tx.del(`${table.name}/${id}`),
                  catch: (cause) => new WriteTransactionError({ cause }),
                }),
              ),
            ),
          );

        return { set, del } as const;
      }),
    },
  ) {}

  export const makeReadRepository = <TTable extends Models.SyncTable>(
    table: TTable,
  ) =>
    Effect.gen(function* () {
      const { scan, get } = yield* Database.ReadTransactionManager;

      const findAll = scan(table);

      const findById = (id: TTable["DataTransferObject"]["Type"]["id"]) =>
        get(table, id);

      const findWhere = <TValue>(
        filter: (
          value: TTable["DataTransferObject"]["Type"],
          index: number,
        ) => Option.Option<TValue>,
      ) => findAll.pipe(Effect.map(Array.filterMap(filter)));

      return { findAll, findById, findWhere } as const;
    });

  export const makeWriteRepository = <TTable extends Models.SyncTable>(
    table: TTable,
    readRepository: Effect.Effect.Success<
      ReturnType<typeof makeReadRepository<TTable>>
    >,
  ) =>
    Effect.gen(function* () {
      const { set, del } = yield* Database.WriteTransactionManager;

      const create = (value: TTable["DataTransferObject"]["Type"]) =>
        set(table, value.id, value);

      const updateById = (
        id: TTable["DataTransferObject"]["Type"]["id"],
        next: (
          prev: TTable["DataTransferObject"]["Type"],
        ) => Partial<
          Omit<TTable["DataTransferObject"]["Type"], "id" | "tenantId">
        >,
      ) =>
        readRepository.findById(id).pipe(
          Effect.map((prev) => ({ ...prev, ...next(prev) })),
          Effect.flatMap((next) => set(table, next.id, next)),
        );

      const deleteById = (id: TTable["DataTransferObject"]["Type"]["id"]) =>
        del(table, id);

      return { create, updateById, deleteById } as const;
    });
}
