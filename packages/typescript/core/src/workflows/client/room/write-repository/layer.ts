import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { RoomWorkflowsWriteRepository } from ".";
import { makeWriteRepository } from "../../../../database/client/write-repository";
import { RoomWorkflowsContract } from "../../../contracts";
import { RoomWorkflowsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomWorkflowsReadRepository;
  const base = yield* makeWriteRepository(RoomWorkflowsContract.Table, repository);

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

export const layer = makeService.pipe(Layer.effect(RoomWorkflowsWriteRepository));
