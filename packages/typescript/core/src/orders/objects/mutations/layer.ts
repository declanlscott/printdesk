import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { OrderObjectMetadataMutations } from ".";
import { Mutation } from "../../../mutations";
import { ProductsRepository } from "../../../products/repositories";
import { ReplicacheContract } from "../../../replicache/contracts";
import { ReplicacheNotifier } from "../../../replicache/notifier";
import { OrderObjectMetadataContract, OrdersContract } from "../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrderObjectMetadataPolicies } from "../policies";
import { OrderObjectMetadataRepository } from "../repositories";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectMetadataRepository;
  const productsRepository = yield* ProductsRepository;

  const policies = yield* OrderObjectMetadataPolicies;
  const ordersPolicies = yield* OrdersPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (object: typeof OrderObjectMetadataContract.Table.Model.Type) =>
    notifier.notifyAfterTransaction(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "order_object_metadata:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_order_object_metadata:read" }),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isCustomerOrManager.make({ id: object.orderId, userId: Option.none() }),
        ),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isManagerAuthorized.make({ id: object.orderId, managerId: Option.none() }),
        ),
      ),
    );

  const create = Mutation.make(OrderObjectMetadataContract.create, {
    makePolicy: Effect.fn("OrderObjectMetadata.Mutations.create.makePolicy")((object) =>
      ordersPolicies.canEdit.make({ id: object.orderId }),
    ),
    mutator: Effect.fn("OrderObjectMetadata.Mutations.create.mutator")((object, { tenantId }) =>
      productsRepository.findByOrderId(object.orderId, tenantId).pipe(
        Effect.filterOrFail(
          (product) => product.config.isValidOrderAttachment(object),
          () => new Cause.IllegalArgumentError(),
        ),
        Effect.andThen(repository.create({ ...object, tenantId })),
        Effect.tap(notify),
      ),
    ),
  });

  const transitionStatus = Mutation.make(OrderObjectMetadataContract.transitionStatus, {
    makePolicy: Effect.fn("OrderObjectMetadata.Mutations.transitionStatus.makePolicy")(({ id }) =>
      policies.canEdit.make({ id }),
    ),
    mutator: Effect.fn("OrderObjectMetadata.Mutations.transitionStatus.mutator")(
      ({ id, status }, user) =>
        repository.updateById(id, { status }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const delete_ = Mutation.make(OrderObjectMetadataContract.delete_, {
    makePolicy: Effect.fn("OrderObjectMetadata.Mutations.delete.makePolicy")(({ id }) =>
      policies.canDelete.make({ id }),
    ),
    mutator: Effect.fn("OrderObjectMetadata.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      repository.updateById(id, { deletedAt }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  return {
    create,
    transitionStatus,
    delete: delete_,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrderObjectMetadataMutations));
