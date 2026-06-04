import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { SharedAccountManagerAccessMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { ReplicacheContract } from "../../../replicache/contracts";
import { ReplicacheNotifier } from "../../../replicache/notifier";
import { SharedAccountManagerAccessContract, SharedAccountsContract } from "../../contracts";
import { SharedAccountManagerAccessPolicies } from "../policies";
import { SharedAccountManagerAccessRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountManagerAccessRepository;

  const policies = yield* SharedAccountManagerAccessPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notify = (access: typeof SharedAccountManagerAccessContract.Table.Model.Type) =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({
          permission: "shared_account_manager_access:read",
        }),
        ReplicacheContract.PullPermission.make({
          permission: "active_shared_account_manager_access:read",
        }),
        ReplicacheContract.PullPolicy.make(
          SharedAccountsContract.isCustomerAuthorized.make({
            id: access.sharedAccountId,
            customerId: Option.none(),
          }),
        ),
        ReplicacheContract.PullPolicy.make(
          SharedAccountsContract.isManagerAuthorized.make({
            id: access.sharedAccountId,
            managerId: Option.none(),
          }),
        ),
      ),
    );

  const create = Mutation.make(SharedAccountManagerAccessContract.create, {
    makePolicy: Effect.fn("SharedAccounts.ManagerAccessMutations.create.makePolicy")(() =>
      AccessControl.userPermissionPolicy("shared_account_manager_access:create"),
    ),
    mutator: Effect.fn("SharedAccounts.ManagerAccessMutations.create.mutator")(
      (access, { tenantId }) => repository.create({ ...access, tenantId }).pipe(Effect.tap(notify)),
    ),
  });

  const delete_ = Mutation.make(SharedAccountManagerAccessContract.delete_, {
    makePolicy: Effect.fn("SharedAccounts.ManagerAccessMutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_account_manager_access:delete"),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("SharedAccounts.ManagerAccessMutations.delete.mutator")(
      ({ id, deletedAt }, user) =>
        repository.updateById(id, { deletedAt }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  const restore = Mutation.make(SharedAccountManagerAccessContract.restore, {
    makePolicy: Effect.fn("SharedAccounts.ManagerAccessMutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("shared_account_manager_access:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("SharedAccounts.ManagerAccessMutations.restore.mutator")(({ id }, user) =>
      repository.updateById(id, { deletedAt: null }, user.tenantId).pipe(Effect.tap(notify)),
    ),
  });

  return { create, delete: delete_, restore } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessMutations));
