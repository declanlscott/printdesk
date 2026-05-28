import * as Effect from "effect/Effect";

import { WriteTransactionManager } from "./write-transaction";

import type { Models } from "../../models";
import type { makeReadRepository } from "./read-repository";

export const makeWriteRepository = Effect.fn(function* <TTable extends Models.SyncTable>(
  table: TTable,
  readRepository: Effect.Success<ReturnType<typeof makeReadRepository<TTable>>>,
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
