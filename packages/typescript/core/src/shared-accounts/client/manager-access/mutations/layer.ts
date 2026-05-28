import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountManagerAccessMutations } from ".";
import { AccessControl } from "../../../../access-control";
import { MutationsContract } from "../../../../mutations/contract";
import { SharedAccountManagerAccessContract } from "../../../contracts";
import { SharedAccountManagerAccessPolicies } from "../policies";
import { SharedAccountManagerAccessWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountManagerAccessWriteRepository;

  const policies = yield* SharedAccountManagerAccessPolicies;

  const create = MutationsContract.makeMutation(SharedAccountManagerAccessContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("shared_account_manager_access:create"),
    mutator: (access, { tenantId }) =>
      SharedAccountManagerAccessContract.Table.Dto.makeEffect({ ...access, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  const delete_ = MutationsContract.makeMutation(SharedAccountManagerAccessContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_account_manager_access:delete"),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(
            AccessControl.userPermissionPolicy("shared_account_manager_access:read"),
          ),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = MutationsContract.makeMutation(SharedAccountManagerAccessContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_account_manager_access:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) => repository.updateById(id, () => Effect.succeed({ deletedAt: null })),
  });

  return { create, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessMutations));
