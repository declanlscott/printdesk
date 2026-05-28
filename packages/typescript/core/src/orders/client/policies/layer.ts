import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { OrdersPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { PoliciesContract } from "../../../policies/contract";
import { OrdersContract } from "../../contract";
import { OrdersReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrdersReadRepository;

  const isCustomer = PoliciesContract.makePolicy(OrdersContract.isCustomer, {
    make: ({ id, customerId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findById(id)
          .pipe(
            Effect.map(Struct.get("customerId")),
            Effect.map(Equal.equals(customerId.pipe(Option.getOrElse(() => user.id)))),
          ),
      ),
  });

  const isManager = PoliciesContract.makePolicy(OrdersContract.isManager, {
    make: ({ id, managerId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findById(id)
          .pipe(
            Effect.map(Struct.get("managerId")),
            Effect.map(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id)))),
          ),
      ),
  });

  const isCustomerOrManager = PoliciesContract.makePolicy(OrdersContract.isCustomerOrManager, {
    make: ({ id, userId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findById(id)
          .pipe(
            Effect.map(
              (order) =>
                order.customerId === userId.pipe(Option.getOrElse(() => user.id)) ||
                order.managerId === userId.pipe(Option.getOrElse(() => user.id)),
            ),
          ),
      ),
  });

  const isManagerAuthorized = PoliciesContract.makePolicy(OrdersContract.isManagerAuthorized, {
    make: ({ id, managerId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findActiveManagerIds(id)
          .pipe(
            Effect.map(Array.some(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id))))),
          ),
      ),
  });

  const canEdit = PoliciesContract.makePolicy(OrdersContract.canEdit, {
    make: ({ id }) =>
      repository.findByIdWithWorkflowStatus(id).pipe(
        Effect.map(({ order, workflowStatus }) =>
          Match.value(order).pipe(
            Match.when({ deletedAt: Match.null }, (o) =>
              Match.value(o).pipe(
                Match.when(
                  { sharedAccountWorkflowStatusId: Match.null },
                  () =>
                    !order.approvedAt &&
                    !(workflowStatus.type === "InProgress" || workflowStatus.type === "Completed"),
                ),
                Match.orElse(() => true),
              ),
            ),
            Match.orElse(() => false),
          ),
        ),
        AccessControl.policy({ name: OrdersContract.Table.name, id }),
      ),
  });

  const canApprove = PoliciesContract.makePolicy(OrdersContract.canApprove, {
    make: ({ id }) =>
      repository.findByIdWithWorkflowStatus(id).pipe(
        Effect.map(({ order }) =>
          Match.value(order).pipe(
            Match.when({ deletedAt: Match.null }, (o) => o.sharedAccountWorkflowStatusId !== null),
            Match.orElse(() => false),
          ),
        ),
        AccessControl.policy({ name: OrdersContract.Table.name, id }),
      ),
  });

  const canTransition = PoliciesContract.makePolicy(OrdersContract.canTransition, {
    make: ({ id }) =>
      repository.findByIdWithWorkflowStatus(id).pipe(
        Effect.map(({ order, workflowStatus }) =>
          Match.value(order).pipe(
            Match.when({ deletedAt: Match.null }, () => workflowStatus.type !== "Completed"),
            Match.orElse(() => false),
          ),
        ),
        AccessControl.policy({ name: OrdersContract.Table.name, id }),
      ),
  });

  const canDelete = PoliciesContract.makePolicy(OrdersContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = PoliciesContract.makePolicy(OrdersContract.canRestore, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNotNull),
          AccessControl.policy({ name: OrdersContract.Table.name, id }),
        ),
  });

  return {
    isCustomer,
    isManager,
    isCustomerOrManager,
    isManagerAuthorized,
    canEdit,
    canApprove,
    canTransition,
    canDelete,
    canRestore,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrdersPolicies));
