import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { DeliveryOptionsWriteRepository } from ".";
import { makeWriteRepository } from "../../../database/client/write-repository";
import { DeliveryOptionsContract } from "../../contract";
import { DeliveryOptionsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsReadRepository;
  const base = yield* makeWriteRepository(DeliveryOptionsContract.Table, repository);

  const updateByRoomId = (
    roomId: (typeof DeliveryOptionsContract.Table.Model.Type)["roomId"],
    deliveryOption: Partial<
      Omit<typeof DeliveryOptionsContract.Table.Model.Type, "id" | "roomId" | "tenantId">
    >,
  ) =>
    repository
      .findWhere((o) =>
        o.roomId === roomId
          ? Result.succeed(base.updateById(o.id, () => Effect.succeed(deliveryOption)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: (typeof DeliveryOptionsContract.Table.Model.Type)["roomId"]) =>
    repository
      .findWhere((o) =>
        o.roomId === roomId ? Result.succeed(base.deleteById(o.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return { ...base, updateByRoomId, deleteByRoomId } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsWriteRepository));
