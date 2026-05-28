import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { MutationsContract } from "../../../mutations/contract";
import { SharedAccountsContract } from "../../contracts";
import { SharedAccountsPolicies } from "../policies";
import { SharedAccountsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountsWriteRepository;

  const policies = yield* SharedAccountsPolicies;

  const edit = MutationsContract.makeMutation(SharedAccountsContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_accounts:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...sharedAccount }) =>
      repository.updateById(id, () => Effect.succeed(sharedAccount)),
  });

  const delete_ = MutationsContract.makeMutation(SharedAccountsContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.every(
          AccessControl.userPermissionPolicy("shared_accounts:delete"),
          policies.canDelete.make({ id }),
        ),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("shared_accounts:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = MutationsContract.makeMutation(SharedAccountsContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_accounts:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) => repository.updateById(id, () => Effect.succeed({ deletedAt: null })),
  });

  return { edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountsMutations));
