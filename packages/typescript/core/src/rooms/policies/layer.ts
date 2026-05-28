import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { RoomsPolicies } from ".";
import { AccessControl } from "../../access-control";
import { PoliciesContract } from "../../policies/contract";
import { RoomsContract } from "../contract";
import { RoomsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomsRepository;

  const canEdit = PoliciesContract.makePolicy(RoomsContract.canEdit, {
    make: Effect.fn("Rooms.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy({ name: RoomsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canDelete = PoliciesContract.makePolicy(RoomsContract.canDelete, {
    make: Effect.fn("Rooms.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = PoliciesContract.makePolicy(RoomsContract.canRestore, {
    make: Effect.fn("Rooms.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy({ name: RoomsContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
    ),
  });

  return { canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomsPolicies));
