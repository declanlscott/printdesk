import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Schema from "effect/Schema";
import { Replicache as ReplicacheClient } from "replicache";

import type * as Option from "effect/Option";
import type {
  ReadTransaction as ReadTx,
  ReplicacheOptions,
  WriteTransaction as WriteTx,
} from "replicache";
import type { Models } from "../models";

export namespace Replicache {
  type Mutators = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tx: WriteTx, args?: any) => any
  >;

  type InferMutator<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TMutator extends (tx: WriteTx, ...args: Array<any>) => any,
  > = TMutator extends (tx: WriteTx, ...args: infer TArgs) => infer TReturn
    ? (
        ...args: TArgs
      ) => TReturn extends Promise<Awaited<TReturn>>
        ? TReturn
        : Promise<TReturn>
    : never;

  type InferMutate<TMutators extends Mutators> = {
    readonly [TKey in keyof TMutators]: InferMutator<TMutators[TKey]>;
  };

  export interface Options<
    TMutators extends Mutators,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  > extends ReplicacheOptions<{}> {
    mutators: TMutators;
  }

  export class Client<TMutators extends Mutators> extends ReplicacheClient {
    constructor(opts: Options<TMutators>) {
      super(opts);
    }

    override get mutate() {
      return super.mutate as InferMutate<TMutators>;
    }
  }

  export class ClientError extends Data.TaggedError("ClientError")<{
    readonly cause: unknown;
  }> {}

  export class MutateError extends Data.TaggedError("MutateError")<{
    readonly cause: unknown;
  }> {}

  export class ReadTransaction extends Effect.Service<ReadTransaction>()(
    "@printdesk/core/replicache/client/ReadTransaction",
    { scoped: (tx: ReadTx | WriteTx) => Effect.succeed({ tx }) },
  ) {}

  export class ReadTransactionError extends Data.TaggedError(
    "ReadTransactionError",
  )<{ readonly cause: unknown }> {}

  export class ReadTransactionManager extends Effect.Service<ReadTransactionManager>()(
    "@printdesk/core/replicache/client/ReadTransactionManager",
    {
      effect: Effect.gen(function* () {
        const { tx } = yield* ReadTransaction;

        const scan = <TTable extends Models.SyncTable>(table: TTable) =>
          Effect.tryPromise({
            try: () => tx.scan({ prefix: `${table.name}/` }).toArray(),
            catch: (cause) => new ReadTransactionError({ cause }),
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
      }),
    },
  ) {}

  export class WriteTransaction extends Effect.Service<WriteTransaction>()(
    "@printdesk/core/replicache/client/WriteTransaction",
    { scoped: (tx: WriteTx) => Effect.succeed({ tx }) },
  ) {}

  export class WriteTransactionError extends Data.TaggedError(
    "WriteTransactionError",
  )<{ readonly cause: unknown }> {}

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
              >(table.DataTransferObject.pipe(Schema.asSchema)),
            ),
            Effect.flatMap((encoded) =>
              Effect.tryPromise({
                try: () => tx.set(`${table.name}/${id}`, encoded),
                catch: (cause) => new WriteTransactionError({ cause }),
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
              catch: (cause) => new WriteTransactionError({ cause }),
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
      const { set, del } = yield* Replicache.WriteTransactionManager;

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
