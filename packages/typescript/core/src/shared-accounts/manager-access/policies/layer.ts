import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { SharedAccountManagerAccessPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { SharedAccountManagerAccessContract } from "../../contracts";
import { SharedAccountManagerAccessRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountManagerAccessRepository;

  const canDelete = Policy.make(SharedAccountManagerAccessContract.canDelete, {
    make: Effect.fn("SharedAccounts.ManagerAccessPolicies.canDelete.make")(({ id }) =>
      AccessControl.userPolicy(
        { name: SharedAccountManagerAccessContract.Table.name, id },
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canRestore = Policy.make(SharedAccountManagerAccessContract.canRestore, {
    make: Effect.fn("SharedAccounts.ManagerAccessPolicies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy(
        { name: SharedAccountManagerAccessContract.Table.name, id },
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
    ),
  });

  return { canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessPolicies));
