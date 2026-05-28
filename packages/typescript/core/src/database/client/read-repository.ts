import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";

import { ReadTransactionManager } from "./read-transaction";

import type { Models } from "../../models";

export const makeReadRepository = Effect.fn(function* <TTable extends Models.SyncTable>(
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
