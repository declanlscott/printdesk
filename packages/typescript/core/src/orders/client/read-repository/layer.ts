import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { OrdersReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { SharedAccountManagerAccessReadRepository } from "../../../shared-accounts/client/manager-access/read-repository";
import { WorkflowStatusesReadRepository } from "../../../workflows/client/status/read-repository";
import { OrdersContract } from "../../contract";

import type { EntityId } from "../../../utils";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const base = yield* makeReadRepository(OrdersContract.Table);

  const workflowStatusesRepository = yield* WorkflowStatusesReadRepository;
  const sharedAccountManagerAccessRepository = yield* SharedAccountManagerAccessReadRepository;

  const findByIdWithWorkflowStatus = Effect.fn(function* (
    id: (typeof OrdersContract.Table.Model.Type)["id"],
  ) {
    const order = yield* base.findById(id);

    const workflowStatus = yield* workflowStatusesRepository.findById(
      order.roomWorkflowStatusId ?? order.sharedAccountWorkflowStatusId,
    );

    return { order, workflowStatus };
  });

  const findByWorkflowStatusId = (workflowStatusId: EntityId) =>
    base.findWhere((order) =>
      order.roomWorkflowStatusId === workflowStatusId ||
      order.sharedAccountWorkflowStatusId === workflowStatusId
        ? Result.succeed(order)
        : Result.failVoid,
    );

  const findActiveManagerIds = (id: (typeof OrdersContract.Table.Model.Type)["id"]) =>
    base
      .findById(id)
      .pipe(
        Effect.flatMap((order) =>
          sharedAccountManagerAccessRepository.findWhere((access) =>
            access.sharedAccountId === order.sharedAccountId && access.deletedAt === null
              ? Result.succeed(access.managerId)
              : Result.failVoid,
          ),
        ),
      );

  return {
    ...base,
    findByIdWithWorkflowStatus,
    findByWorkflowStatusId,
    findActiveManagerIds,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrdersReadRepository));
