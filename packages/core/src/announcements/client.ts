import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { AnnouncementsContract } from "./contract";

export namespace Announcements {
  const table = Models.syncTables[AnnouncementsContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/announcements/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/announcements/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;
        const base = yield* Replicache.makeWriteRepository(table, repository);

        const updateByRoomId = (
          roomId: AnnouncementsContract.DataTransferObject["roomId"],
          announcement: Partial<
            Omit<
              AnnouncementsContract.DataTransferObject,
              "id" | "roomId" | "tenantId"
            >
          >,
        ) =>
          repository
            .findWhere((a) =>
              a.roomId === roomId
                ? Option.some(base.updateById(a.id, () => announcement))
                : Option.none(),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

        const deleteByRoomId = (
          roomId: AnnouncementsContract.DataTransferObject["roomId"],
        ) =>
          repository
            .findWhere((a) =>
              a.roomId === roomId
                ? Option.some(base.deleteById(a.id))
                : Option.none(),
            )
            .pipe(Effect.flatMap(Effect.allWith({ concurrency: "unbounded" })));

        return { ...base, updateByRoomId, deleteByRoomId } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/announcements/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const canEdit = PoliciesContract.makePolicy(
          AnnouncementsContract.canEdit,
          {
            make: ({ id }) =>
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNull),
                AccessControl.policy({
                  name: AnnouncementsContract.tableName,
                  id,
                }),
              ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          AnnouncementsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = PoliciesContract.makePolicy(
          AnnouncementsContract.canRestore,
          {
            make: ({ id }) =>
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNotNull),
                AccessControl.policy({
                  name: AnnouncementsContract.tableName,
                  id,
                }),
              ),
          },
        );

        return { canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/announcements/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const policies = yield* Policies;

        const create = MutationsContract.makeMutation(
          AnnouncementsContract.create,
          {
            makePolicy: () => AccessControl.permission("announcements:create"),
            mutator: (announcement, user) =>
              repository.create(
                AnnouncementsContract.DataTransferObject.make({
                  ...announcement,
                  authorId: user.id,
                  tenantId: user.tenantId,
                }),
              ),
          },
        );

        const edit = MutationsContract.makeMutation(
          AnnouncementsContract.edit,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("announcements:update"),
                policies.canEdit.make({ id }),
              ),
            mutator: ({ id, ...announcement }) =>
              repository.updateById(id, () => announcement),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          AnnouncementsContract.delete_,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("announcements:delete"),
                policies.canDelete.make({ id }),
              ),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("announcements:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        const restore = MutationsContract.makeMutation(
          AnnouncementsContract.restore,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("announcements:delete"),
                policies.canRestore.make({ id }),
              ),
            mutator: ({ id }) =>
              repository
                .updateById(id, () => ({ deletedAt: null }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("announcements:read"),
                  ),
                ),
          },
        );

        return { create, edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
