import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { UsersPolicies } from ".";
import { AccessControl } from "../../access-control";
import { PoliciesContract } from "../../policies/contract";
import { UsersContract } from "../contract";
import { UsersRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* UsersRepository;

  const isSelf = PoliciesContract.makePolicy(UsersContract.isSelf, {
    make: Effect.fn("Users.Policies.isSelf.make")(({ id }) =>
      AccessControl.userPolicy({ name: UsersContract.Table.name, id }, (user) =>
        Effect.succeed(id === user.id),
      ),
    ),
  });

  const canEdit = PoliciesContract.makePolicy(UsersContract.canEdit, {
    make: Effect.fn("Users.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy({ name: UsersContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
      ),
    ),
  });

  const canDelete = PoliciesContract.makePolicy(UsersContract.canDelete, {
    make: Effect.fn("Users.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = PoliciesContract.makePolicy(UsersContract.canRestore, {
    make: Effect.fn("Users.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy({ name: UsersContract.Table.name, id }, ({ tenantId }) =>
        repository
          .findById(id, tenantId)
          .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
      ),
    ),
  });

  return { isSelf, canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersPolicies));
