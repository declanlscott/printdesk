import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { AccessControl } from "../access-control2";
import { Announcements } from "../announcements2/client";
import { DataAccessContract } from "../data-access2/contract";
import { DeliveryOptions } from "../delivery-options2/client";
import { Models } from "../models2";
import { Products } from "../products2/client";
import { Replicache } from "../replicache2/client";
import { RoomWorkflows } from "../workflows2/client";
import { RoomWorkflowsContract } from "../workflows2/contracts";
import { RoomsContract } from "./contract";

export namespace Rooms {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/rooms/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.rooms.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/rooms/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([Models.SyncTables.rooms, ReadRepository]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/rooms/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const canEdit = DataAccessContract.makePolicy(RoomsContract.canEdit, {
          make: ({ id }) =>
            AccessControl.policy(() =>
              repository
                .findById(id)
                .pipe(
                  Effect.map(Struct.get("deletedAt")),
                  Effect.map(Predicate.isNull),
                ),
            ),
        });

        const canDelete = DataAccessContract.makePolicy(
          RoomsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = DataAccessContract.makePolicy(
          RoomsContract.canRestore,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
          },
        );

        return { canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/rooms/client/Mutations",
    {
      accessors: true,
      dependencies: [
        WriteRepository.Default,
        RoomWorkflows.WriteRepository.Default,
        Announcements.WriteRepository.Default,
        DeliveryOptions.WriteRepository.Default,
        Products.WriteRepository.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;
        const announcementsRepository = yield* Announcements.WriteRepository;
        const deliveryOptionsRepository =
          yield* DeliveryOptions.WriteRepository;
        const workflowsRepository = yield* RoomWorkflows.WriteRepository;
        const productsRepository = yield* Products.WriteRepository;

        const policies = yield* Policies;

        const create = DataAccessContract.makeMutation(RoomsContract.create, {
          makePolicy: () => AccessControl.permission("rooms:create"),
          mutator: ({ workflowId, ...room }, { tenantId }) =>
            Effect.all(
              Tuple.make(
                repository.create(
                  RoomsContract.DataTransferObject.make({
                    ...room,
                    tenantId,
                  }),
                ),
                workflowsRepository.create(
                  RoomWorkflowsContract.DataTransferObject.make({
                    id: workflowId,
                    roomId: room.id,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt,
                    tenantId,
                  }),
                ),
              ),
              { concurrency: "unbounded" },
            ).pipe(Effect.map(Tuple.at(0))),
        });

        const edit = DataAccessContract.makeMutation(RoomsContract.edit, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:update"),
              policies.canEdit.make({ id }),
            ),
          mutator: ({ id, ...room }) => repository.updateById(id, () => room),
        });

        const publish = DataAccessContract.makeMutation(RoomsContract.publish, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:update"),
              policies.canEdit.make({ id }),
            ),
          mutator: ({ id, updatedAt }) =>
            repository.updateById(id, () => ({
              status: "published",
              updatedAt,
            })),
        });

        const draft = DataAccessContract.makeMutation(RoomsContract.draft, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:update"),
              policies.canEdit.make({ id }),
            ),
          mutator: ({ id, updatedAt }) =>
            Effect.all(
              Tuple.make(
                repository.updateById(id, () => ({
                  status: "draft",
                  updatedAt,
                })),
                productsRepository.updateByRoomId(id, {
                  status: "draft",
                  updatedAt,
                }),
              ),
              { concurrency: "unbounded" },
            ).pipe(Effect.map(Tuple.at(0))),
        });

        const delete_ = DataAccessContract.makeMutation(RoomsContract.delete_, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:delete"),
              policies.canDelete.make({ id }),
            ),
          mutator: ({ id, deletedAt }) =>
            Effect.all(
              Tuple.make(
                repository
                  .updateById(id, () => ({ deletedAt, status: "draft" }))
                  .pipe(
                    AccessControl.enforce(
                      AccessControl.permission("rooms:read"),
                    ),
                    Effect.catchTag("AccessDeniedError", () =>
                      repository.deleteById(id),
                    ),
                  ),
                announcementsRepository.updateByRoomId(id, { deletedAt }).pipe(
                  AccessControl.enforce(
                    AccessControl.permission("announcements:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    announcementsRepository.deleteByRoomId(id),
                  ),
                ),
                deliveryOptionsRepository
                  .updateByRoomId(id, { deletedAt })
                  .pipe(
                    AccessControl.enforce(
                      AccessControl.permission("delivery_options:read"),
                    ),
                    Effect.catchTag("AccessDeniedError", () =>
                      deliveryOptionsRepository.deleteByRoomId(id),
                    ),
                  ),
                workflowsRepository.updateByRoomId(id, { deletedAt }).pipe(
                  AccessControl.enforce(
                    AccessControl.permission("room_workflows:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    workflowsRepository.deleteByRoomId(id),
                  ),
                ),
                productsRepository
                  .updateByRoomId(id, { deletedAt, status: "draft" })
                  .pipe(
                    AccessControl.enforce(
                      AccessControl.permission("products:read"),
                    ),
                    Effect.catchTag("AccessDeniedError", () =>
                      productsRepository.deleteByRoomId(id),
                    ),
                  ),
              ),
              { concurrency: "unbounded" },
            ).pipe(Effect.map(Tuple.at(0))),
        });

        const restore = DataAccessContract.makeMutation(RoomsContract.restore, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:delete"),
              policies.canRestore.make({ id }),
            ),
          mutator: ({ id }) =>
            Effect.all(
              Tuple.make(
                repository.updateById(id, () => ({ deletedAt: null })),
                workflowsRepository.updateByRoomId(id, { deletedAt: null }),
              ),
              { concurrency: "unbounded" },
            ).pipe(Effect.map(Tuple.at(0))),
        });

        return {
          create,
          edit,
          publish,
          draft,
          delete: delete_,
          restore,
        } as const;
      }),
    },
  ) {}
}
