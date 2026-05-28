import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";

import { DeliveryOptionsMutations } from ".";
import { AccessControl } from "../../access-control";
import { MutationsContract } from "../../mutations/contract";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { RoomsRepository } from "../../rooms/repository";
import { DeliveryOptionsContract } from "../contract";
import { DeliveryOptionsPolicies } from "../policies";
import { DeliveryOptionsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsRepository;
  const roomsRepository = yield* RoomsRepository;

  const policies = yield* DeliveryOptionsPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (deliveryOption: typeof DeliveryOptionsContract.Table.Model.Type) =>
    roomsRepository.findById(deliveryOption.roomId, deliveryOption.tenantId).pipe(
      Effect.map((room) =>
        Match.value(room).pipe(
          Match.whenAnd({ deletedAt: Match.null }, { status: Match.is("published") }, () =>
            Array.make(
              ReplicacheContract.PullPermission.make({ permission: "delivery_options:read" }),
              ReplicacheContract.PullPermission.make({
                permission: "active_delivery_options:read",
              }),
              ReplicacheContract.PullPermission.make({
                permission: "active_published_room_delivery_options:read",
              }),
            ),
          ),
          Match.orElse(() =>
            Array.make(
              ReplicacheContract.PullPermission.make({ permission: "delivery_options:read" }),
              ReplicacheContract.PullPermission.make({
                permission: "active_delivery_options:read",
              }),
            ),
          ),
        ),
      ),
      Effect.flatMap(notifier.notify),
      Effect.catch(() => Effect.void),
    );

  const create = MutationsContract.makeMutation(DeliveryOptionsContract.create, {
    makePolicy: Effect.fn("DeliveryOptions.Mutations.create.makePolicy")(() =>
      AccessControl.userPermissionPolicy("delivery_options:create"),
    ),
    mutator: Effect.fn("DeliveryOptions.Mutations.create.mutator")((deliveryOption, { tenantId }) =>
      repository.create({ ...deliveryOption, tenantId }).pipe(Effect.tap(notify)),
    ),
  });

  const edit = MutationsContract.makeMutation(DeliveryOptionsContract.edit, {
    makePolicy: Effect.fn("DeliveryOptions.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("delivery_options:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("DeliveryOptions.Mutations.edit.mutator")(
      ({ id, ...deliveryOption }, user) =>
        repository.updateById(id, deliveryOption, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const delete_ = MutationsContract.makeMutation(DeliveryOptionsContract.delete_, {
    makePolicy: Effect.fn("DeliveryOptions.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("delivery_options:delete"),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("DeliveryOptions.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      repository.updateById(id, { deletedAt }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const restore = MutationsContract.makeMutation(DeliveryOptionsContract.restore, {
    makePolicy: Effect.fn("DeliveryOptions.Mutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("delivery_options:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("DeliveryOptions.Mutations.restore.mutator")(({ id }, user) =>
      repository.updateById(id, { deletedAt: null }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  return { create, edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsMutations));
