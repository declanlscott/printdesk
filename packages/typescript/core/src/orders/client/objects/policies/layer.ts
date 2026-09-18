import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Struct from "effect/Struct";

import { OrderObjectMetadataPolicies } from ".";
import { AccessControl } from "../../../../access-control";
import { Policy } from "../../../../policies";
import { OrderObjectMetadataContract } from "../../../contracts";
import { OrdersPolicies } from "../../policies";
import { OrdersRepository } from "../../repository";
import { OrderObjectMetadataRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrderObjectMetadataRepository;
  const ordersRepository = yield* OrdersRepository;

  const ordersPolicies = yield* OrdersPolicies;

  const isCustomer = Policy.make(OrderObjectMetadataContract.isCustomer, {
    make: ({ id, customerId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository.findById(id).pipe(
            Effect.flatMap((metadata) => ordersRepository.findById(metadata.orderId)),
            Effect.map(Struct.get("customerId")),
            Effect.map(Equal.equals(customerId.pipe(Option.getOrElse(() => user.id)))),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
  });

  const isManager = Policy.make(OrderObjectMetadataContract.isManager, {
    make: ({ id, managerId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository.findById(id).pipe(
            Effect.flatMap((metadata) => ordersRepository.findById(metadata.orderId)),
            Effect.map(Struct.get("managerId")),
            Effect.map(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id)))),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
  });

  const isCustomerOrManager = Policy.make(OrderObjectMetadataContract.isCustomerOrManager, {
    make: ({ id, userId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository.findById(id).pipe(
            Effect.flatMap((metadata) => ordersRepository.findById(metadata.orderId)),
            Effect.map(
              (order) =>
                order.customerId === userId.pipe(Option.getOrElse(() => user.id)) ||
                order.managerId === userId.pipe(Option.getOrElse(() => user.id)),
            ),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
  });

  const isManagerAuthorized = Policy.make(OrderObjectMetadataContract.isManagerAuthorized, {
    make: ({ id, managerId }) =>
      AccessControl.userPolicy(
        (user) =>
          repository.findById(id).pipe(
            Effect.flatMap((metadata) => ordersRepository.findActiveManagerIds(metadata.orderId)),
            Effect.map(Array.some(Equal.equals(managerId.pipe(Option.getOrElse(() => user.id))))),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
  });

  const canEdit = Policy.make(OrderObjectMetadataContract.canEdit, {
    make: ({ id }) =>
      AccessControl.userPolicy(
        () =>
          repository.findById(id).pipe(
            Effect.map(Struct.get("orderId")),
            Effect.flatMap((id) => ordersPolicies.canEdit.make({ id })),
            Effect.as(true),
            Effect.catchTag("AccessDeniedError", () => Effect.succeed(false)),
          ),
        { name: OrderObjectMetadataContract.Table.name, id },
      ),
  });

  const canDelete = Policy.make(OrderObjectMetadataContract.canDelete, {
    make: canEdit.make,
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
