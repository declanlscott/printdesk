import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";

import { ReadTransactionManager, WriteTransactionManager } from "./transactions";

import type { Models } from "../../models";

export const readRepositoryFactory = Effect.fn(function* <TTable extends Models.SyncTable>(
  table: TTable,
) {
  const { scan, get } = yield* ReadTransactionManager;

  const findAll = scan(table);

  const findById = (id: TTable["Dto"]["Type"]["id"]) => get(table, id);

  const findWhere = <TValue>(
    filter: (value: TTable["Dto"]["Type"], index: number) => Result.Result<TValue, void>,
  ) => findAll.pipe(Effect.map(Array.filterMap(filter)));

  return { findAll, findById, findWhere } as const;
});

export const writeRepositoryFactory = Effect.fn(function* <TTable extends Models.SyncTable>(
  table: TTable,
  readRepository: Effect.Success<ReturnType<typeof readRepositoryFactory<TTable>>>,
) {
  const { set, del } = yield* WriteTransactionManager;

  const create = (value: TTable["Dto"]["Type"]) => set(table, value.id, value);

  const updateById = Effect.fn(function* <TGetUpdateError, TGetUpdateServices>(
    id: TTable["Dto"]["Type"]["id"],
    getUpdate: (
      prev: TTable["Dto"]["Type"],
    ) => Effect.Effect<
      Partial<Omit<TTable["Dto"]["Type"], "id" | "tenantId">>,
      TGetUpdateError,
      TGetUpdateServices
    >,
  ) {
    const prev = yield* readRepository.findById(id);
    const update = yield* getUpdate(prev);

    return yield* set(table, id, { ...prev, ...update });
  });

  const deleteById = (id: TTable["Dto"]["Type"]["id"]) => del(table, id);

  return { create, updateById, deleteById } as const;
});
