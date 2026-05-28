import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { OrdersPolicies } from ".";
import { AccessControl } from "../../access-control";
import { PoliciesContract } from "../../policies/contract";
import { OrdersContract } from "../contract";
import { OrdersRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrdersRepository;

  const decode = Schema.decodeUnknownEffect(OrdersContract.Table.Model);

  const isCustomer = PoliciesContract.makePolicy(OrdersContract.isCustomer, {
    make: Effect.fn("Orders.Policies.isCustomer.make")(({ id, customerId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findById(id, user.tenantId)
          .pipe(
            Effect.map(Struct.get("customerId")),
            Effect.map(Equal.equals(customerId.pipe(Option.getOrElse(() => user.id)))),
          ),
      ),
    ),
  });

  const isManager = PoliciesContract.makePolicy(OrdersContract.isManager, {
    make: Effect.fn("Orders.Policies.isManager.make")(({ id, managerId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findById(id, user.tenantId)
          .pipe(
            Effect.map(Struct.get("managerId")),
            Effect.map(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id)))),
          ),
      ),
    ),
  });

  const isCustomerOrManager = PoliciesContract.makePolicy(OrdersContract.isCustomerOrManager, {
    make: Effect.fn("Orders.Policies.isCustomerOrManager")(({ id, userId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findById(id, user.tenantId)
          .pipe(
            Effect.map(
              (order) =>
                order.customerId === userId.pipe(Option.getOrElse(() => userId)) ||
                order.managerId === userId.pipe(Option.getOrElse(() => userId)),
            ),
          ),
      ),
    ),
  });

  const isManagerAuthorized = PoliciesContract.makePolicy(OrdersContract.isManagerAuthorized, {
    make: Effect.fn("Orders.Policies.isManagerAuthorized")(({ id, managerId }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, (user) =>
        repository
          .findActiveManagerIds(id, user.tenantId)
          .pipe(
            Effect.map(Array.some(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id))))),
          ),
      ),
    ),
  });

  const canEdit = PoliciesContract.makePolicy(OrdersContract.canEdit, {
    make: Effect.fn("Orders.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, ({ tenantId }) =>
        repository.findByIdWithWorkflowStatus(id, tenantId).pipe(
          Effect.flatMap(({ order, workflowStatus }) =>
            decode(order).pipe(Effect.map((order) => ({ order, workflowStatus }))),
          ),
          Effect.map(({ order, workflowStatus }) =>
            Match.value(order).pipe(
              Match.when({ deletedAt: Match.null }, (o) =>
                Match.value(o).pipe(
                  Match.when(
                    { sharedAccountWorkflowStatusId: Match.null },
                    () =>
                      !order.approvedAt &&
                      !(
                        workflowStatus.type === "InProgress" || workflowStatus.type === "Completed"
                      ),
                  ),
                  Match.orElse(() => true),
                ),
              ),
              Match.orElse(() => false),
            ),
          ),
        ),
      ),
    ),
  });

  const canApprove = PoliciesContract.makePolicy(OrdersContract.canApprove, {
    make: Effect.fn("Orders.Policies.canApprove.make")(({ id }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, ({ tenantId }) =>
        repository.findByIdWithWorkflowStatus(id, tenantId).pipe(
          Effect.map(({ order }) =>
            Match.value(order).pipe(
              Match.when(
                { deletedAt: Match.null },
                (o) => o.sharedAccountWorkflowStatusId !== null,
              ),
              Match.orElse(() => false),
            ),
          ),
        ),
      ),
    ),
  });

  const canTransition = PoliciesContract.makePolicy(OrdersContract.canTransition, {
    make: Effect.fn("Orders.Policies.canTransition.make")(({ id }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, ({ tenantId }) =>
        repository.findByIdWithWorkflowStatus(id, tenantId).pipe(
          Effect.map(({ order, workflowStatus }) =>
            Match.value(order).pipe(
              Match.when({ deletedAt: Match.null }, () => workflowStatus.type !== "Completed"),
              Match.orElse(() => false),
            ),
          ),
        ),
      ),
    ),
  });

  const canDelete = PoliciesContract.makePolicy(OrdersContract.canDelete, {
    make: Effect.fn("Orders.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = PoliciesContract.makePolicy(OrdersContract.canRestore, {
    make: Effect.fn("Orders.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy({ name: OrdersContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
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
