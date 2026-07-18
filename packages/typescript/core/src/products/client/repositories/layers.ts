import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { ProductsReadRepository, ProductsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { ProductsContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(ProductsContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(Layer.effect(ProductsReadRepository));

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = Effect.gen(function* () {
  const repository = yield* ProductsReadRepository;
  const base = yield* writeRepositoryFactory(ProductsContract.Table, repository);

  const updateByRoomId = (
    roomId: (typeof ProductsContract.Table.Model.Type)["roomId"],
    product: Partial<Omit<typeof ProductsContract.Table.Model.Type, "id" | "roomId" | "tenantId">>,
  ) =>
    repository
      .findWhere((p) =>
        p.roomId === roomId
          ? Result.succeed(base.updateById(p.id, () => Effect.succeed(product)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: (typeof ProductsContract.Table.Model.Type)["roomId"]) =>
    repository
      .findWhere((p) =>
        p.roomId === roomId ? Result.succeed(base.deleteById(p.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return { ...base, updateByRoomId, deleteByRoomId } as const;
});
export const writeRepositoryLayer = makeWriteRepository.pipe(Layer.effect(ProductsWriteRepository));
