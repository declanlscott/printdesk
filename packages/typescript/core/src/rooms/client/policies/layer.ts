import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { RoomsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { PoliciesContract } from "../../../policies/contract";
import { RoomsContract } from "../../contract";
import { RoomsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomsReadRepository;

  const canEdit = PoliciesContract.makePolicy(RoomsContract.canEdit, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNull),
          AccessControl.policy({ name: RoomsContract.Table.name, id }),
        ),
  });

  const canDelete = PoliciesContract.makePolicy(RoomsContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = PoliciesContract.makePolicy(RoomsContract.canRestore, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNotNull),
          AccessControl.policy({ name: RoomsContract.Table.name, id }),
        ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomsPolicies));
