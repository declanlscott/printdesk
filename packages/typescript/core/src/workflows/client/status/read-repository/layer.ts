import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Number from "effect/Number";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import * as Struct from "effect/Struct";

import { WorkflowStatusesReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { WorkflowStatusesContract } from "../../../contracts";

import type { EntityId } from "../../../../utils";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const base = yield* makeReadRepository(WorkflowStatusesContract.Table);

  const findLastByWorkflowId = (workflowId: EntityId) =>
    base
      .findWhere((ws) =>
        ws.roomWorkflowId === workflowId || ws.sharedAccountWorkflowId === workflowId
          ? Result.succeed(ws)
          : Result.failVoid,
      )
      .pipe(
        Effect.map(Array.sortBy(Order.mapInput(Order.Number, Struct.get("index")))),
        Effect.map(Array.last),
        Effect.flatMap(Effect.fromOption),
      );

  const findSlice = (
    id: (typeof WorkflowStatusesContract.Table.Model.Type)["id"],
    index: (typeof WorkflowStatusesContract.Table.Model.Type)["index"],
  ) =>
    base.findById(id).pipe(
      Effect.flatMap((workflowStatus) =>
        base.findWhere((ws) =>
          (ws.roomWorkflowId === workflowStatus.roomWorkflowId ||
            ws.sharedAccountWorkflowId === workflowStatus.sharedAccountWorkflowId) &&
          Number.between(ws.index, {
            minimum: Number.min(workflowStatus.index, index),
            maximum: Number.max(workflowStatus.index, index),
          })
            ? Result.succeed(ws)
            : Result.failVoid,
        ),
      ),
      Effect.map(Array.sortBy(Order.mapInput(Order.Number, Struct.get("index")))),
    );

  const findTailSliceById = (id: (typeof WorkflowStatusesContract.Table.Model.Type)["id"]) =>
    base
      .findById(id)
      .pipe(
        Effect.flatMap((workflowStatus) =>
          base.findWhere((ws) =>
            (ws.roomWorkflowId === workflowStatus.roomWorkflowId ||
              ws.sharedAccountWorkflowId === workflowStatus.sharedAccountWorkflowId) &&
            ws.index >= workflowStatus.index
              ? Result.succeed(ws)
              : Result.failVoid,
          ),
        ),
      );

  return {
    ...base,
    findLastByWorkflowId,
    findSlice,
    findTailSliceById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesReadRepository));
