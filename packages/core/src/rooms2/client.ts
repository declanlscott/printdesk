import { Effect, Tuple } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Products } from "../products2/client";
import { Replicache } from "../replicache2/client";
import { RoomWorkflows } from "../workflows2/client";
import { RoomWorkflowsContract } from "../workflows2/contracts";
import { RoomsContract } from "./contracts";

export namespace Rooms {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/rooms/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(RoomsContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/rooms/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(RoomsContract.table, repository),
        ),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/rooms/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;
        const workflowsRepository = yield* RoomWorkflows.WriteRepository;
        const productsRepository = yield* Products.WriteRepository;

        const create = DataAccessContract.makeMutation(
          RoomsContract.create,
          Effect.succeed({
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
          }),
        );

        const edit = DataAccessContract.makeMutation(
          RoomsContract.edit,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, ...room }) => repository.updateById(id, room),
          }),
        );

        const publish = DataAccessContract.makeMutation(
          RoomsContract.publish,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, updatedAt }) =>
              repository.updateById(id, { status: "published", updatedAt }),
          }),
        );

        const draft = DataAccessContract.makeMutation(
          RoomsContract.draft,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, updatedAt }) =>
              Effect.all(
                Tuple.make(
                  repository.updateById(id, { status: "draft", updatedAt }),
                  productsRepository.updateByRoomId(id, {
                    status: "draft",
                    updatedAt,
                  }),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0))),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          RoomsContract.delete_,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id, deletedAt }) =>
              Effect.all(
                Tuple.make(
                  repository.updateById(id, { deletedAt }).pipe(
                    AccessControl.enforce(
                      AccessControl.permission("rooms:read"),
                    ),
                    Effect.catchTag("AccessDeniedError", () =>
                      repository.deleteById(id),
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
                  productsRepository.updateByRoomId(id, { deletedAt }).pipe(
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
          }),
        );

        const restore = DataAccessContract.makeMutation(
          RoomsContract.restore,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id }) =>
              Effect.all(
                Tuple.make(
                  repository.updateById(id, { deletedAt: null }),
                  workflowsRepository.updateByRoomId(id, { deletedAt: null }),
                  productsRepository.updateByRoomId(id, { deletedAt: null }),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0))),
          }),
        );

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
