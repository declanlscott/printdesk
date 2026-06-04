import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AnnouncementsPolicies } from ".";
import { AccessControl } from "../../access-control";
import { Policy } from "../../policies";
import { AnnouncementsContract } from "../contract";
import { AnnouncementsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* AnnouncementsRepository;

  const canEdit = Policy.make(AnnouncementsContract.canEdit, {
    make: Effect.fn("Announcements.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy({ name: AnnouncementsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canDelete = Policy.make(AnnouncementsContract.canDelete, {
    make: Effect.fn("Announcements.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = Policy.make(AnnouncementsContract.canRestore, {
    make: Effect.fn("Announcements.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy({ name: AnnouncementsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
    ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsPolicies));
