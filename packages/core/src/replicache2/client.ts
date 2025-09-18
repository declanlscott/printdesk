import { Cause, Data, Effect, Schema } from "effect";

import type {
  ReadTransaction as ReadTx,
  WriteTransaction as WriteTx,
} from "replicache";
import type { Models } from "../models2";

export namespace Replicache {
  export class ReplicacheError extends Data.TaggedError(
    "@printdesk/core/replicache/client/ReplicacheError",
  )<{ cause: unknown }> {}

  export class ReadTransaction extends Effect.Service<ReadTransaction>()(
    "@printdesk/core/replicache/client/ReadTransaction",
    { scoped: (tx: ReadTx | WriteTx) => Effect.succeed({ tx }) },
  ) {}

  export class ReadTransactionManager extends Effect.Service<ReadTransactionManager>()(
    "@printdesk/core/replicache/client/ReadTransactionManager",
    {
      effect: Effect.gen(function* () {
        const { tx } = yield* ReadTransaction;

        const scan = <TTable extends Models.SyncTable>(table: TTable) =>
          Effect.tryPromise({
            try: () => tx.scan({ prefix: `${table.name}/` }).toArray(),
            catch: (cause) => new ReplicacheError({ cause }),
          }).pipe(
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
            const value = yield* Effect.tryPromise({
              try: () => tx.get(`${table.name}/${id}`),
              catch: (cause) => new ReplicacheError({ cause }),
            });

            if (!value)
              return yield* Effect.fail(new Cause.NoSuchElementException());

            return yield* Effect.succeed(value).pipe(
              Effect.flatMap(
                Schema.decodeUnknown<
                  TTable["DataTransferObject"]["Type"],
                  TTable["DataTransferObject"]["Encoded"],
                  never
                >(Schema.asSchema(table.DataTransferObject)),
              ),
            );
          });

        return { scan, get } as const;
      }),
    },
  ) {}

  export class WriteTransaction extends Effect.Service<WriteTransaction>()(
    "@printdesk/core/replicache/client/WriteTransaction",
    { scoped: (tx: WriteTx) => Effect.succeed({ tx }) },
  ) {}

  export class WriteTransactionManager extends Effect.Service<WriteTransactionManager>()(
    "@printdesk/core/replicache/client/WriteTransactionManager",
    {
      dependencies: [ReadTransactionManager.Default],
      effect: Effect.gen(function* () {
        const { tx } = yield* WriteTransaction;
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
              >(Schema.asSchema(table.DataTransferObject)),
            ),
            Effect.flatMap((encoded) =>
              Effect.tryPromise({
                try: () => tx.set(`${table.name}/${id}`, encoded),
                catch: (cause) => new ReplicacheError({ cause }),
              }),
            ),
            Effect.andThen(get(table, id)),
          );

        const del = <TTable extends Models.SyncTable>(
          table: TTable,
          id: TTable["DataTransferObject"]["Type"]["id"],
        ) =>
          Effect.zipLeft(
            get(table, id),
            Effect.tryPromise({
              try: () => tx.del(`${table.name}/${id}`),
              catch: (cause) => new ReplicacheError({ cause }),
            }),
          );

        return { set, del } as const;
      }),
    },
  ) {}

  export const makeReadRepository = <TTable extends Models.SyncTable>(
    table: TTable,
  ) =>
    Effect.gen(function* () {
      const { scan, get } = yield* Replicache.ReadTransactionManager;

      const findAll = scan(table);

      const findById = (id: TTable["DataTransferObject"]["Type"]["id"]) =>
        get(table, id);

      return { findAll, findById } as const;
    });

  export const makeWriteRepository = <TTable extends Models.SyncTable>(
    table: TTable,
    readRepository: Effect.Effect.Success<
      ReturnType<typeof makeReadRepository<TTable>>
    >,
  ) =>
    Effect.gen(function* () {
      const { set, del } = yield* Replicache.WriteTransactionManager;

      const create = (value: TTable["DataTransferObject"]["Type"]) =>
        set(table, value.id, value);

      const updateById = (
        id: TTable["DataTransferObject"]["Type"]["id"],
        update: (
          prev: TTable["DataTransferObject"]["Type"],
        ) => Partial<
          Omit<TTable["DataTransferObject"]["Type"], "id" | "tenantId">
        >,
      ) =>
        readRepository.findById(id).pipe(
          Effect.map((prev) => ({ ...prev, ...update(prev) })),
          Effect.flatMap((next) => set(table, next.id, next)),
        );

      const deleteById = (id: TTable["DataTransferObject"]["Type"]["id"]) =>
        del(table, id);

      return { create, updateById, deleteById } as const;
    });
}
