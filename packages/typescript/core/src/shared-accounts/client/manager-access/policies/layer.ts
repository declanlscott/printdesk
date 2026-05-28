import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { SharedAccountManagerAccessPolicies } from ".";
import { AccessControl } from "../../../../access-control";
import { PoliciesContract } from "../../../../policies/contract";
import { SharedAccountManagerAccessContract } from "../../../contracts";
import { SharedAccountManagerAccessReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountManagerAccessReadRepository;

  const canDelete = PoliciesContract.makePolicy(SharedAccountManagerAccessContract.canDelete, {
    make: ({ id }) =>
      repository.findById(id).pipe(
        Effect.map(Struct.get("deletedAt")),
        Effect.map(Predicate.isNull),
        AccessControl.policy({
          name: SharedAccountManagerAccessContract.Table.name,
          id,
        }),
      ),
  });

  const canRestore = PoliciesContract.makePolicy(SharedAccountManagerAccessContract.canRestore, {
    make: ({ id }) =>
      repository.findById(id).pipe(
        Effect.map(Struct.get("deletedAt")),
        Effect.map(Predicate.isNotNull),
        AccessControl.policy({
          name: SharedAccountManagerAccessContract.Table.name,
          id,
        }),
      ),
  });

  return { canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessPolicies));
