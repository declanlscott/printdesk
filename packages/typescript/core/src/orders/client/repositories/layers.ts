import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { OrdersReadRepository, OrdersWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { SharedAccountManagerAccessReadRepository } from "../../../shared-accounts/client/manager-access/repositories";
import { WorkflowStatusesReadRepository } from "../../../workflows/client/status/repositories";
import { OrdersContract } from "../../contract";

import type { EntityId } from "../../../utils";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = Effect.gen(function* () {
  const base = yield* readRepositoryFactory(OrdersContract.Table);

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
export const readRepositoryLayer = makeReadRepository.pipe(Layer.effect(OrdersReadRepository));

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = OrdersReadRepository.pipe(
  Effect.flatMap((repository) => writeRepositoryFactory(OrdersContract.Table, repository)),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(Layer.effect(OrdersWriteRepository));
