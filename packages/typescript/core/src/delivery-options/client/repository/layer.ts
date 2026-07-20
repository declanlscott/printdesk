import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { DeliveryOptionsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { DeliveryOptionsContract } from "../../contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(DeliveryOptionsContract.Table);

  const updateByRoomId = (
    roomId: typeof DeliveryOptionsContract.Table.Model.Type.roomId,
    deliveryOption: Partial<
      Omit<typeof DeliveryOptionsContract.Table.Model.Type, "id" | "roomId" | "tenantId">
    >,
  ) =>
    repository
      .findWhere((opt) =>
        opt.roomId === roomId
          ? Result.succeed(repository.updateById(opt.id, () => Effect.succeed(deliveryOption)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: typeof DeliveryOptionsContract.Table.Model.Type.roomId) =>
    repository
      .findWhere((opt) =>
        opt.roomId === roomId ? Result.succeed(repository.deleteById(opt.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return { ...repository, updateByRoomId, deleteByRoomId } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsRepository));
