import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { UsersPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { PoliciesContract } from "../../../policies/contract";
import { UsersContract } from "../../contract";
import { UsersReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* UsersReadRepository;

  const isSelf = PoliciesContract.makePolicy(UsersContract.isSelf, {
    make: ({ id }) =>
      AccessControl.userPolicy({ name: UsersContract.Table.name, id }, (user) =>
        Effect.succeed(id === user.id),
      ),
  });

  const canEdit = PoliciesContract.makePolicy(UsersContract.canEdit, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNull),
          AccessControl.policy({ name: UsersContract.Table.name, id }),
        ),
  });

  const canDelete = PoliciesContract.makePolicy(UsersContract.canDelete, {
    make: canEdit.make,
  });

  const canRestore = PoliciesContract.makePolicy(UsersContract.canRestore, {
    make: ({ id }) =>
      repository
        .findById(id)
        .pipe(
          Effect.map(Struct.get("deletedAt")),
          Effect.map(Predicate.isNotNull),
          AccessControl.policy({ name: UsersContract.Table.name, id }),
        ),
  });

  return { isSelf, canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersPolicies));
