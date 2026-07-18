import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { RoomWorkflowsReadRepository, RoomWorkflowsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../../database/client/repositories";
import { RoomWorkflowsContract } from "../../../contracts";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = readRepositoryFactory(RoomWorkflowsContract.Table);
export const readRepositoryLayer = makeReadRepository.pipe(
  Layer.effect(RoomWorkflowsReadRepository),
);

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = Effect.gen(function* () {
  const repository = yield* RoomWorkflowsReadRepository;
  const base = yield* writeRepositoryFactory(RoomWorkflowsContract.Table, repository);

  const updateByRoomId = (
    roomId: (typeof RoomWorkflowsContract.Table.Model.Type)["roomId"],
    roomWorkflow: Partial<
      Omit<typeof RoomWorkflowsContract.Table.Model.Type, "id" | "roomId" | "tenantId">
    >,
  ) =>
    repository
      .findWhere((w) =>
        w.roomId === roomId
          ? Result.succeed(base.updateById(w.id, () => Effect.succeed(roomWorkflow)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: (typeof RoomWorkflowsContract.Table.Model.Type)["roomId"]) =>
    repository
      .findWhere((w) =>
        w.roomId === roomId ? Result.succeed(base.deleteById(w.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return { ...base, updateByRoomId, deleteByRoomId } as const;
});
export const writeRepositoryLayer = makeWriteRepository.pipe(
  Layer.effect(RoomWorkflowsWriteRepository),
);
