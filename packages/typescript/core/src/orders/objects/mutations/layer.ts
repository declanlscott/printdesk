import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { OrderObjectsMutations } from ".";
import { Mutation } from "../../../mutations";
import { ReplicacheContract } from "../../../replicache/contracts";
import { ReplicacheNotifier } from "../../../replicache/notifier";
import { OrderObjectsContract, OrdersContract } from "../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrderObjectsPolicies } from "../policies";
import { OrderObjectsRepository } from "../repositories";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectsRepository;

  const policies = yield* OrderObjectsPolicies;
  const ordersPolicies = yield* OrdersPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (object: typeof OrderObjectsContract.Table.Model.Type) =>
    notifier.notifyAfterTransaction(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "order_objects:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_order_objects:read" }),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isCustomerOrManager.make({ id: object.orderId, userId: Option.none() }),
        ),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isManagerAuthorized.make({ id: object.orderId, managerId: Option.none() }),
        ),
      ),
    );

  const create = Mutation.make(OrderObjectsContract.create, {
    makePolicy: Effect.fn("OrderObjects.Mutations.create.makePolicy")((object) =>
      ordersPolicies.canEdit.make({ id: object.orderId }),
    ),
    mutator: Effect.fn("OrderObjects.Mutations.create.mutator")((object, { tenantId }) =>
      repository.create({ ...object, tenantId }).pipe(Effect.tap(notify)),
    ),
  });

  const transitionStatus = Mutation.make(OrderObjectsContract.transitionStatus, {
    makePolicy: Effect.fn("OrderObjects.Mutations.transitionStatus.makePolicy")(({ id }) =>
      policies.canEdit.make({ id }),
    ),
    mutator: Effect.fn("OrderObjects.Mutations.transitionStatus.mutator")(({ id, status }, user) =>
      repository.updateById(id, { status }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const delete_ = Mutation.make(OrderObjectsContract.delete_, {
    makePolicy: Effect.fn("OrderObjects.Mutations.delete.makePolicy")(({ id }) =>
      policies.canDelete.make({ id }),
    ),
    mutator: Effect.fn("OrderObjects.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      repository.updateById(id, { deletedAt }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  return {
    create,
    transitionStatus,
    delete: delete_,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrderObjectsMutations));
