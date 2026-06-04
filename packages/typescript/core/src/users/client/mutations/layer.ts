import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { UsersMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { UsersContract } from "../../contract";
import { UsersPolicies } from "../policies";
import { UsersWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* UsersWriteRepository;

  const policies = yield* UsersPolicies;

  const edit = Mutation.make(UsersContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("users:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...user }) => repository.updateById(id, () => Effect.succeed(user)),
  });

  const delete_ = Mutation.make(UsersContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("users:delete"),
          policies.isSelf.make({ id }),
        ),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("users:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = Mutation.make(UsersContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("users:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) => repository.updateById(id, () => Effect.succeed({ deletedAt: null })),
  });

  return { edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersMutations));
