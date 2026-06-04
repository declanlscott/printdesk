import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { RoomsMutations } from ".";
import { AccessControl } from "../../access-control";
import { AnnouncementsRepository } from "../../announcements/repository";
import { DeliveryOptionsRepository } from "../../delivery-options/repository";
import { Mutation } from "../../mutations";
import { ProductsRepository } from "../../products/repository";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { RoomWorkflowsRepository } from "../../workflows/room/repository";
import { RoomsContract } from "../contract";
import { RoomsPolicies } from "../policies";
import { RoomsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomsRepository;
  const announcementsRepository = yield* AnnouncementsRepository;
  const deliveryOptionsRepository = yield* DeliveryOptionsRepository;
  const productsRepository = yield* ProductsRepository;
  const workflowsRepository = yield* RoomWorkflowsRepository;

  const policies = yield* RoomsPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notifyCreate = (room: typeof RoomsContract.Table.Model.Type) =>
    Match.value(room).pipe(
      Match.when({ status: Match.is("published") }, () =>
        Array.make(
          ReplicacheContract.PullPermission.make({ permission: "rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_published_rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "room_workflows:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_room_workflows:read" }),
          ReplicacheContract.PullPermission.make({
            permission: "active_published_room_room_workflows:read",
          }),
        ),
      ),
      Match.orElse(() =>
        Array.make(
          ReplicacheContract.PullPermission.make({ permission: "rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "room_workflows:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_room_workflows:read" }),
        ),
      ),
      notifier.notify,
    );

  const notifyEdit = (room: typeof RoomsContract.Table.Model.Type) =>
    Match.value(room).pipe(
      Match.when({ status: Match.is("published") }, () =>
        Array.make(
          ReplicacheContract.PullPermission.make({ permission: "rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_published_rooms:read" }),
        ),
      ),
      Match.orElse(() =>
        Array.make(
          ReplicacheContract.PullPermission.make({ permission: "rooms:read" }),
          ReplicacheContract.PullPermission.make({ permission: "active_rooms:read" }),
        ),
      ),
      notifier.notify,
    );

  const notifyPublish = () =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "rooms:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_rooms:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_published_rooms:read" }),
        ReplicacheContract.PullPermission.make({
          permission: "active_published_room_announcements:read",
        }),
        ReplicacheContract.PullPermission.make({
          permission: "active_published_room_delivery_options:read",
        }),
        ReplicacheContract.PullPermission.make({
          permission: "active_published_room_room_workflows:read",
        }),
        ReplicacheContract.PullPermission.make({ permission: "active_published_products:read" }),
      ),
    );
  const notifyDraft = notifyPublish;

  const notifyDelete = () =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "rooms:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_rooms:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_published_rooms:read" }),
        ReplicacheContract.PullPermission.make({ permission: "announcements:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_announcements:read" }),
        ReplicacheContract.PullPermission.make({
          permission: "active_published_room_announcements:read",
        }),
        ReplicacheContract.PullPermission.make({ permission: "delivery_options:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_delivery_options:read" }),
        ReplicacheContract.PullPermission.make({
          permission: "active_published_room_delivery_options:read",
        }),
        ReplicacheContract.PullPermission.make({ permission: "room_workflows:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_room_workflows:read" }),
        ReplicacheContract.PullPermission.make({
          permission: "active_published_room_room_workflows:read",
        }),
        ReplicacheContract.PullPermission.make({ permission: "products:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_products:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_published_products:read" }),
      ),
    );

  const notifyRestore = () =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "rooms:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_rooms:read" }),
        ReplicacheContract.PullPermission.make({ permission: "room_workflows:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_room_workflows:read" }),
      ),
    );

  const create = Mutation.make(RoomsContract.create, {
    makePolicy: Effect.fn("Rooms.Mutations.create.makePolicy")(() =>
      AccessControl.userPermissionPolicy("rooms:create"),
    ),
    mutator: Effect.fn("Rooms.Mutations.create.mutator")(({ workflowId, ...room }, { tenantId }) =>
      Effect.all(
        Tuple.make(
          repository.create({ ...room, tenantId }),
          workflowsRepository.create({
            id: workflowId,
            roomId: room.id,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            tenantId,
          }),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0)), Effect.tap(notifyCreate)),
    ),
  });

  const edit = Mutation.make(RoomsContract.edit, {
    makePolicy: Effect.fn("Rooms.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Rooms.Mutations.edit.mutator")(({ id, ...room }, user) =>
      repository.updateById(id, room, user.tenantId).pipe(Effect.tap(notifyEdit)),
    ),
  });

  const publish = Mutation.make(RoomsContract.publish, {
    makePolicy: Effect.fn("Rooms.Mutations.publish.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Rooms.Mutations.publish.mutator")(({ id, updatedAt }, user) =>
      repository
        .updateById(id, { status: "published", updatedAt }, user.tenantId)
        .pipe(Effect.tap(notifyPublish)),
    ),
  });

  const draft = Mutation.make(RoomsContract.draft, {
    makePolicy: Effect.fn("Rooms.Mutations.draft.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Rooms.Mutations.draft.mutator")(({ id, updatedAt }, user) =>
      Effect.all(
        Tuple.make(
          repository.updateById(id, { status: "draft", updatedAt }, user.tenantId),
          productsRepository.updateByRoomId(id, { status: "draft", updatedAt }, user.tenantId),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0)), Effect.tap(notifyDraft)),
    ),
  });

  const delete_ = Mutation.make(RoomsContract.delete_, {
    makePolicy: Effect.fn("Rooms.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:delete"),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("Rooms.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      Effect.all(
        Tuple.make(
          repository.updateById(id, { deletedAt, status: "draft" }, user.tenantId),
          announcementsRepository.updateByRoomId(id, { deletedAt }, user.tenantId),
          deliveryOptionsRepository.updateByRoomId(id, { deletedAt }, user.tenantId),
          workflowsRepository.updateByRoomId(id, { deletedAt }, user.tenantId),
          productsRepository.updateByRoomId(id, { deletedAt, status: "draft" }, user.tenantId),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0)), Effect.tap(notifyDelete)),
    ),
  });

  const restore = Mutation.make(RoomsContract.restore, {
    makePolicy: Effect.fn("Rooms.Mutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("Rooms.Mutations.restore.mutator")(({ id }, user) =>
      Effect.all(
        Tuple.make(
          repository
            .updateById(id, { deletedAt: null }, user.tenantId)
            .pipe(Effect.map(Struct.omit(["version"]))),
          workflowsRepository.updateByRoomId(id, { deletedAt: null }, user.tenantId),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0)), Effect.tap(notifyRestore)),
    ),
  });

  return {
    create,
    edit,
    publish,
    draft,
    delete: delete_,
    restore,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomsMutations));
