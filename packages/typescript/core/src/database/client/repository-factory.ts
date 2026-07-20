import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";

import { Database } from ".";

import type { Models } from "../../models";

export const repositoryFactory = Effect.fn(function* <TTable extends Models.SyncTable>(
  table: TTable,
) {
  const { scan, get, set, del } = yield* Database;

  const findAll = scan(table);

  const findById = (id: TTable["Dto"]["Type"]["id"]) => get(table, id);

  const findWhere = <TValue>(
    filter: (value: TTable["Dto"]["Type"], index: number) => Result.Result<TValue, void>,
  ) => findAll.pipe(Effect.map(Array.filterMap(filter)));

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
    const prev = yield* findById(id);
    const update = yield* getUpdate(prev);

    return yield* set(table, id, { ...prev, ...update });
  });

  const deleteById = (id: TTable["Dto"]["Type"]["id"]) => del(table, id);

  return {
    findAll,
    findById,
    findWhere,
    create,
    updateById,
    deleteById,
  } as const;
});
