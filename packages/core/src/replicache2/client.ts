import { Cause, Data, Effect, Schema } from "effect";

import type {
  ReadTransaction as ReadTx,
  WriteTransaction as WriteTx,
} from "replicache";
import type { SyncTable } from "../database2/tables";

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

        const scan = <TTable extends SyncTable>(table: TTable) =>
          Effect.tryPromise({
            try: () => tx.scan({ prefix: `${table.name}/` }).toArray(),
            catch: (cause) => new ReplicacheError({ cause }),
          }).pipe(
            Effect.flatMap(
              Schema.decodeUnknown<
                ReadonlyArray<TTable["Schema"]["Type"]>,
                ReadonlyArray<TTable["Schema"]["Encoded"]>,
                never
              >(Schema.Array(table.Schema)),
            ),
          );

        const get = <TTable extends SyncTable>(
          table: TTable,
          id: TTable["Schema"]["Type"]["id"],
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
                  TTable["Schema"]["Type"],
                  TTable["Schema"]["Encoded"],
                  never
                >(Schema.asSchema(table.Schema)),
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

        const set = <TTable extends SyncTable>(
          table: TTable,
          id: TTable["Schema"]["Type"]["id"],
          value: TTable["Schema"]["Type"],
        ) =>
          Effect.succeed(value).pipe(
            Effect.flatMap(
              Schema.encode<
                TTable["Schema"]["Type"],
                TTable["Schema"]["Encoded"],
                never
              >(Schema.asSchema(table.Schema)),
            ),
            Effect.flatMap((encoded) =>
              Effect.tryPromise({
                try: () => tx.set(`${table.name}/${id}`, encoded),
                catch: (cause) => new ReplicacheError({ cause }),
              }),
            ),
            Effect.andThen(get(table, id)),
          );

        const del = <TTable extends SyncTable>(
          table: TTable,
          id: TTable["Schema"]["Type"]["id"],
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

  export const makeReadRepository = <TTable extends SyncTable>(table: TTable) =>
    Effect.gen(function* () {
      const { scan, get } = yield* Replicache.ReadTransactionManager;

      const findAll = scan(table);

      const findById = (id: TTable["Schema"]["Type"]["id"]) => get(table, id);

      return { findAll, findById } as const;
    });

  export const makeWriteRepository = <TTable extends SyncTable>(
    table: TTable,
    readRepository: Effect.Effect.Success<
      ReturnType<typeof makeReadRepository<TTable>>
    >,
  ) =>
    Effect.gen(function* () {
      const { set, del } = yield* Replicache.WriteTransactionManager;

      const create = (value: TTable["Schema"]["Type"]) =>
        set(table, value.id, value);

      const updateById = (
        id: TTable["Schema"]["Type"]["id"],
        value: Partial<Omit<TTable["Schema"]["Type"], "id" | "tenantId">>,
      ) =>
        readRepository.findById(id).pipe(
          Effect.map((prev) => ({ ...prev, ...value })),
          Effect.flatMap((value) => set(table, value.id, value)),
        );

      const deleteById = (id: TTable["Schema"]["Type"]["id"]) => del(table, id);

      return { create, updateById, deleteById } as const;
    });
}
