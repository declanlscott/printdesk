import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { SharedAccountsMutations } from ".";
import { AccessControl } from "../../access-control";
import { MutationsContract } from "../../mutations/contract";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { SharedAccountsContract } from "../contracts";
import { SharedAccountsPolicies } from "../policies";
import { SharedAccountsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountsRepository;

  const policies = yield* SharedAccountsPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (sharedAccount: typeof SharedAccountsContract.Table.Model.Type) =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "shared_accounts:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_shared_accounts:read" }),
        ReplicacheContract.PullPolicy.make(
          SharedAccountsContract.isCustomerAuthorized.make({
            id: sharedAccount.id,
            customerId: Option.none(),
          }),
        ),
        ReplicacheContract.PullPolicy.make(
          SharedAccountsContract.isManagerAuthorized.make({
            id: sharedAccount.id,
            managerId: Option.none(),
          }),
        ),
      ),
    );

  const edit = MutationsContract.makeMutation(SharedAccountsContract.edit, {
    makePolicy: Effect.fn("SharedAccounts.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_accounts:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("SharedAccounts.Mutations.edit.mutator")(({ id, ...sharedAccount }, user) =>
      repository.updateById(id, sharedAccount, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const delete_ = MutationsContract.makeMutation(SharedAccountsContract.delete_, {
    makePolicy: Effect.fn("SharedAccounts.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_accounts:delete"),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("SharedAccounts.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      repository.updateById(id, { deletedAt }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const restore = MutationsContract.makeMutation(SharedAccountsContract.restore, {
    makePolicy: Effect.fn("SharedAccounts.Mutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_accounts:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("SharedAccounts.Mutations.restore.mutator")(({ id }, user) =>
      repository.updateById(id, { deletedAt: null }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  return { edit, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountsMutations));
