import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AnnouncementsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { AnnouncementsContract } from "../../contract";
import { AnnouncementsPolicies } from "../policies";
import { AnnouncementsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* AnnouncementsWriteRepository;

  const policies = yield* AnnouncementsPolicies;

  const create = Mutation.make(AnnouncementsContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("announcements:create"),
    mutator: (announcement, user) =>
      AnnouncementsContract.Table.Dto.makeEffect({
        ...announcement,
        authorId: user.id,
        tenantId: user.tenantId,
      }).pipe(Effect.flatMap(repository.create)),
  });

  const edit = Mutation.make(AnnouncementsContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("announcements:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...announcement }) =>
      repository.updateById(id, () => Effect.succeed(announcement)),
  });

  const delete_ = Mutation.make(AnnouncementsContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("announcements:delete"),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("announcements:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = Mutation.make(AnnouncementsContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("announcements:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt: null }))
        .pipe(AccessControl.enforce(AccessControl.userPermissionPolicy("announcements:read"))),
  });

  return { create, edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsMutations));
