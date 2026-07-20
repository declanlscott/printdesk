import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { RoomWorkflowsRepository } from ".";
import { repositoryFactory } from "../../../../database/client/repository-factory";
import { RoomWorkflowsContract } from "../../../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(RoomWorkflowsContract.Table);

  const updateByRoomId = (
    roomId: typeof RoomWorkflowsContract.Table.Model.Type.roomId,
    roomWorkflow: Partial<
      Omit<typeof RoomWorkflowsContract.Table.Model.Type, "id" | "roomId" | "tenantId">
    >,
  ) =>
    repository
      .findWhere((w) =>
        w.roomId === roomId
          ? Result.succeed(repository.updateById(w.id, () => Effect.succeed(roomWorkflow)))
          : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  const deleteByRoomId = (roomId: typeof RoomWorkflowsContract.Table.Model.Type.roomId) =>
    repository
      .findWhere((w) =>
        w.roomId === roomId ? Result.succeed(repository.deleteById(w.id)) : Result.failVoid,
      )
      .pipe(Effect.flatMap((effects) => Effect.all(effects, { concurrency: "unbounded" })));

  return {
    ...repository,
    updateByRoomId,
    deleteByRoomId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomWorkflowsRepository));
