import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";

import { AnnouncementsMutations } from ".";
import { AccessControl } from "../../access-control";
import { MutationsContract } from "../../mutations/contract";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { RoomsRepository } from "../../rooms/repository";
import { AnnouncementsContract } from "../contract";
import { AnnouncementsPolicies } from "../policies";
import { AnnouncementsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* AnnouncementsRepository;
  const roomsRepository = yield* RoomsRepository;

  const policies = yield* AnnouncementsPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (announcement: typeof AnnouncementsContract.Table.Model.Type) =>
    roomsRepository.findById(announcement.roomId, announcement.tenantId).pipe(
      Effect.map((room) =>
        Match.value(room).pipe(
          Match.whenAnd({ deletedAt: Match.null }, { status: Match.is("published") }, () =>
            Array.make(
              ReplicacheContract.PullPermission.make({ permission: "announcements:read" }),
              ReplicacheContract.PullPermission.make({ permission: "active_announcements:read" }),
              ReplicacheContract.PullPermission.make({
                permission: "active_published_room_announcements:read",
              }),
            ),
          ),
          Match.orElse(() =>
            Array.make(
              ReplicacheContract.PullPermission.make({ permission: "announcements:read" }),
              ReplicacheContract.PullPermission.make({ permission: "active_announcements:read" }),
            ),
          ),
        ),
      ),
      Effect.flatMap(notifier.notify),
      Effect.catch(() => Effect.void),
    );

  const create = MutationsContract.makeMutation(AnnouncementsContract.create, {
    makePolicy: Effect.fn("Announcements.Mutations.create.makePolicy")(() =>
      AccessControl.userPermissionPolicy("announcements:create"),
    ),
    mutator: Effect.fn("Announcements.Mutations.create.mutator")((announcement, user) =>
      repository
        .create({ ...announcement, authorId: user.id, tenantId: user.tenantId })
        .pipe(Effect.tap(notify)),
    ),
  });

  const edit = MutationsContract.makeMutation(AnnouncementsContract.edit, {
    makePolicy: Effect.fn("Announcements.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("announcements:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Announcements.Mutations.edit.mutator")(({ id, ...announcement }, user) =>
      repository.updateById(id, announcement, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const delete_ = MutationsContract.makeMutation(AnnouncementsContract.delete_, {
    makePolicy: Effect.fn("Announcements.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("announcements:delete"),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("Announcements.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      repository.updateById(id, { deletedAt }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const restore = MutationsContract.makeMutation(AnnouncementsContract.restore, {
    makePolicy: Effect.fn("Announcements.Mutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("announcements:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("Announcements.Mutations.restore.mutator")(({ id }, user) =>
      repository.updateById(id, { deletedAt: null }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  return { create, edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsMutations));
