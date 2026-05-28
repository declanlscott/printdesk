import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AnnouncementsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { PoliciesContract } from "../../../policies/contract";
import { AnnouncementsContract } from "../../contract";
import { AnnouncementsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* AnnouncementsReadRepository;

  const canEdit = PoliciesContract.makePolicy(AnnouncementsContract.canEdit, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNull),
          AccessControl.policy({ name: AnnouncementsContract.Table.name, id }),
        ),
  });

  const canDelete = PoliciesContract.makePolicy(AnnouncementsContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = PoliciesContract.makePolicy(AnnouncementsContract.canRestore, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNotNull),
          AccessControl.policy({ name: AnnouncementsContract.Table.name, id }),
        ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsPolicies));
