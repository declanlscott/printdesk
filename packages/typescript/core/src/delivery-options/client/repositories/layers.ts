import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { DeliveryOptionsReadRepository, DeliveryOptionsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { DeliveryOptionsContract } from "../../contract";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(DeliveryOptionsContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(
  Layer.effect(DeliveryOptionsReadRepository),
);

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsReadRepository;
  const base = yield* writeRepositoryFactory(DeliveryOptionsContract.Table, repository);

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
export const writeRepositoryLayer = makeWriteRepository.pipe(
  Layer.effect(DeliveryOptionsWriteRepository),
);
