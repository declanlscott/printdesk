import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { ProductsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { ProductsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(ProductsContract.Table);

  const updateByRoomId = (
    roomId: typeof ProductsContract.Table.Model.Type.roomId,
    product: Partial<Omit<typeof ProductsContract.Table.Model.Type, "id" | "roomId" | "tenantId">>,
  ) =>
    repository
      .findWhere((p) =>
        p.roomId === roomId
          ? Result.succeed(repository.updateById(p.id, () => Effect.succeed(product)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: typeof ProductsContract.Table.Model.Type.roomId) =>
    repository
      .findWhere((p) =>
        p.roomId === roomId ? Result.succeed(repository.deleteById(p.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return {
    ...repository,
    updateByRoomId,
    deleteByRoomId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ProductsRepository));
