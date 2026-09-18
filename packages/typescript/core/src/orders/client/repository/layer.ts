import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Result from "effect/Result";

import { OrdersRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { SharedAccountManagerAccessRepository } from "../../../shared-accounts/client/manager-access/repository";
import { WorkflowStatusesRepository } from "../../../workflows/client/status/repository";
import { OrdersContract } from "../../contracts";

import type { EntityId } from "../../../utils";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(OrdersContract.Table);
  const workflowStatusesRepository = yield* WorkflowStatusesRepository;
  const sharedAccountManagerAccessRepository = yield* SharedAccountManagerAccessRepository;

  const findWithWorkflowStatusById = Effect.fn(function* (
    id: typeof OrdersContract.Table.Model.Type.id,
  ) {
    const order = yield* repository.findById(id);

    const workflowStatus = yield* Option.fromNullOr(
      order.roomWorkflowStatusId ?? order.sharedAccountWorkflowStatusId,
    ).pipe(Effect.fromOption, Effect.flatMap(workflowStatusesRepository.findById));

    return { order, workflowStatus };
  });

  const findByWorkflowStatusId = Effect.fn((workflowStatusId: EntityId) =>
    repository.findWhere((order) =>
      order.roomWorkflowStatusId === workflowStatusId ||
      order.sharedAccountWorkflowStatusId === workflowStatusId
        ? Result.succeed(order)
        : Result.failVoid,
    ),
  );

  const findActiveManagerIds = Effect.fn((id: typeof OrdersContract.Table.Model.Type.id) =>
    repository
      .findById(id)
      .pipe(
        Effect.flatMap((order) =>
          sharedAccountManagerAccessRepository.findWhere((access) =>
            access.sharedAccountId === order.sharedAccountId && access.deletedAt === null
              ? Result.succeed(access.managerId)
              : Result.failVoid,
          ),
        ),
      ),
  );

  return {
    ...repository,
    findWithWorkflowStatusById,
    findByWorkflowStatusId,
    findActiveManagerIds,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrdersRepository));
