import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { UsersPolicies } from ".";
import { AccessControl } from "../../access-control";
import { Policy } from "../../policies";
import { UsersContract } from "../contract";
import { UsersRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* UsersRepository;

  const isSelf = Policy.make(UsersContract.isSelf, {
    make: Effect.fn("Users.Policies.isSelf.make")(({ id }) =>
      AccessControl.userPolicy((user) => Effect.succeed(id === user.id), {
        name: UsersContract.Table.name,
        id,
      }),
    ),
  });

  const canEdit = Policy.make(UsersContract.canEdit, {
    make: Effect.fn("Users.Policies.canEdit.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNull)),
        { name: UsersContract.Table.name, id },
      ),
    ),
  });

  const canDelete = Policy.make(UsersContract.canDelete, {
    make: Effect.fn("Users.Policies.canDelete.make")(canEdit.make),
  });

  const canRestore = Policy.make(UsersContract.canRestore, {
    make: Effect.fn("Users.Policies.canRestore.make")(({ id }) =>
      AccessControl.userPolicy(
        ({ tenantId }) =>
          repository
            .findById(id, tenantId)
            .pipe(Effect.map(Struct.get("deletedAt")), Effect.map(Predicate.isNotNull)),
        { name: UsersContract.Table.name, id },
      ),
    ),
  });

  return { isSelf, canEdit, canDelete, canRestore } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersPolicies));
