import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Tuple from "effect/Tuple";

import { RoomsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { AnnouncementsWriteRepository } from "../../../announcements/client/write-repository";
import { DeliveryOptionsWriteRepository } from "../../../delivery-options/client/write-repository";
import { Mutation } from "../../../mutations";
import { ProductsWriteRepository } from "../../../products/client/write-repository";
import { RoomWorkflowsWriteRepository } from "../../../workflows/client/room/write-repository";
import { RoomWorkflowsContract } from "../../../workflows/contracts";
import { RoomsContract } from "../../contract";
import { RoomsPolicies } from "../policies";
import { RoomsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomsWriteRepository;
  const announcementsRepository = yield* AnnouncementsWriteRepository;
  const deliveryOptionsRepository = yield* DeliveryOptionsWriteRepository;
  const workflowsRepository = yield* RoomWorkflowsWriteRepository;
  const productsRepository = yield* ProductsWriteRepository;

  const policies = yield* RoomsPolicies;

  const create = Mutation.make(RoomsContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("rooms:create"),
    mutator: ({ workflowId, ...room }, { tenantId }) =>
      Effect.all(
        Tuple.make(
          RoomsContract.Table.Dto.makeEffect({ ...room, tenantId }).pipe(
            Effect.flatMap(repository.create),
          ),
          RoomWorkflowsContract.Table.Dto.makeEffect({
            id: workflowId,
            roomId: room.id,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            tenantId,
          }).pipe(Effect.flatMap(workflowsRepository.create)),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0))),
  });

  const edit = Mutation.make(RoomsContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...room }) => repository.updateById(id, () => Effect.succeed(room)),
  });

  const publish = Mutation.make(RoomsContract.publish, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, updatedAt }) =>
      repository.updateById(id, () => Effect.succeed({ status: "published", updatedAt })),
  });

  const draft = Mutation.make(RoomsContract.draft, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, updatedAt }) =>
      Effect.all(
        Tuple.make(
          repository.updateById(id, () => Effect.succeed({ status: "draft", updatedAt })),
          productsRepository.updateByRoomId(id, { status: "draft", updatedAt }),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0))),
  });

  const delete_ = Mutation.make(RoomsContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:delete"),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      Effect.all(
        Tuple.make(
          repository
            .updateById(id, () => Effect.succeed({ deletedAt, status: "draft" }))
            .pipe(
              AccessControl.enforce(AccessControl.userPermissionPolicy("rooms:read")),
              Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
            ),
          announcementsRepository.updateByRoomId(id, { deletedAt }).pipe(
            AccessControl.enforce(AccessControl.userPermissionPolicy("announcements:read")),
            Effect.catchTag("AccessDeniedError", () => announcementsRepository.deleteByRoomId(id)),
          ),
          deliveryOptionsRepository.updateByRoomId(id, { deletedAt }).pipe(
            AccessControl.enforce(AccessControl.userPermissionPolicy("delivery_options:read")),
            Effect.catchTag("AccessDeniedError", () =>
              deliveryOptionsRepository.deleteByRoomId(id),
            ),
          ),
          workflowsRepository.updateByRoomId(id, { deletedAt }).pipe(
            AccessControl.enforce(AccessControl.userPermissionPolicy("room_workflows:read")),
            Effect.catchTag("AccessDeniedError", () => workflowsRepository.deleteByRoomId(id)),
          ),
          productsRepository.updateByRoomId(id, { deletedAt, status: "draft" }).pipe(
            AccessControl.enforce(AccessControl.userPermissionPolicy("products:read")),
            Effect.catchTag("AccessDeniedError", () => productsRepository.deleteByRoomId(id)),
          ),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0))),
  });

  const restore = Mutation.make(RoomsContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("rooms:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) =>
      Effect.all(
        Tuple.make(
          repository.updateById(id, () => Effect.succeed({ deletedAt: null })),
          workflowsRepository.updateByRoomId(id, { deletedAt: null }),
        ),
        { concurrency: "unbounded" },
      ).pipe(Effect.map(Tuple.get(0))),
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
