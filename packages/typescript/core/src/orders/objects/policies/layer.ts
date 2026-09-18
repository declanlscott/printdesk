import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Struct from "effect/Struct";

import { OrderObjectMetadataPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { OrderObjectMetadataContract } from "../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrderObjectMetadataRepository } from "../repositories";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const metadataRepository = yield* OrderObjectMetadataRepository;

  const ordersPolicies = yield* OrdersPolicies;

  const isCustomer = Policy.make(OrderObjectMetadataContract.isCustomer, {
    make: Effect.fn("OrderObjectMetadata.Policies.isCustomer.make")(({ id, customerId }) =>
      AccessControl.userPolicy(
        (user) =>
          metadataRepository.findWithOrderById(id, user.tenantId).pipe(
            Effect.map(({ order }) => order.customerId),
            Effect.map(Equal.equals(customerId.pipe(Option.getOrElse(() => user.id)))),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
    ),
  });

  const isManager = Policy.make(OrderObjectMetadataContract.isManager, {
    make: Effect.fn("OrderObjectMetadata.Policies.isManager.make")(({ id, managerId }) =>
      AccessControl.userPolicy(
        (user) =>
          metadataRepository.findWithOrderById(id, user.tenantId).pipe(
            Effect.map(({ order }) => order.managerId),
            Effect.map(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id)))),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
    ),
  });

  const isCustomerOrManager = Policy.make(OrderObjectMetadataContract.isCustomerOrManager, {
    make: Effect.fn("OrderObjectMetadata.Policies.isCustomerOrManager")(({ id, userId }) =>
      AccessControl.userPolicy(
        (user) =>
          metadataRepository.findWithOrderById(id, user.tenantId).pipe(
            Effect.map(Struct.get("order")),
            Effect.map(
              (order) =>
                order.customerId === userId.pipe(Option.getOrElse(() => user.id)) ||
                order.managerId === userId.pipe(Option.getOrElse(() => user.id)),
            ),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
    ),
  });

  const isManagerAuthorized = Policy.make(OrderObjectMetadataContract.isManagerAuthorized, {
    make: Effect.fn("OrderObjectMetadata.Policies.isManagerAuthorized")(({ id, managerId }) =>
      AccessControl.userPolicy(
        (user) =>
          metadataRepository
            .findActiveManagerIds(id, user.tenantId)
            .pipe(
              Effect.map(Array.some(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id))))),
            ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
    ),
  });

  const canEdit = Policy.make(OrderObjectMetadataContract.canEdit, {
    make: Effect.fn("OrderObjectMetadata.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          metadataRepository.findById(id, tenantId).pipe(
            Effect.map(Struct.get("orderId")),
            Effect.flatMap((id) => ordersPolicies.canEdit.make({ id })),
            Effect.as(true),
            Effect.catchTag("AccessDeniedError", () => Effect.succeed(false)),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
    ),
  });

  const canDelete = Policy.make(OrderObjectMetadataContract.canDelete, {
    make: Effect.fn("OrderObjectMetadata.Policies.canDelete.make")(canEdit.make),
  });

  return {
    isCustomer,
    isManager,
    isCustomerOrManager,
    isManagerAuthorized,
    canEdit,
    canDelete,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrderObjectMetadataPolicies));
