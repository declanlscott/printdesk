import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control2";
import { Models } from "../models2";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache2/client";
import {
  SharedAccountCustomerAccessContract,
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "./contracts";

export namespace SharedAccounts {
  const customerAccessTable =
    Models.SyncTables[SharedAccountCustomerAccessContract.tableName];
  const managerAccessTable =
    Models.SyncTables[SharedAccountManagerAccessContract.tableName];
  const table = Models.SyncTables[SharedAccountsContract.tableName];

  export class CustomerAccessReadRepository extends Effect.Service<CustomerAccessReadRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAccessReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: customerAccessTable.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class CustomerAccessWriteRepository extends Effect.Service<CustomerAccessWriteRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAccessWriteRepository",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        CustomerAccessReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        customerAccessTable,
        CustomerAccessReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class ManagerAccessReadRepository extends Effect.Service<ManagerAccessReadRepository>()(
    "@printdesk/core/shared-accounts/client/ManagerAccessReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: managerAccessTable.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class ManagerAccessWriteRepository extends Effect.Service<ManagerAccessWriteRepository>()(
    "@printdesk/core/shared-accounts/client/ManagerAccessWriteRepository",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        ManagerAccessReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        managerAccessTable,
        ManagerAccessReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class ManagerAccessPolicies extends Effect.Service<ManagerAccessPolicies>()(
    "@printdesk/core/shared-accounts/ManagerAccessPolicies",
    {
      accessors: true,
      dependencies: [ManagerAccessReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAccessReadRepository;

        const canDelete = PoliciesContract.makePolicy(
          SharedAccountManagerAccessContract.canDelete,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
          },
        );

        const canRestore = PoliciesContract.makePolicy(
          SharedAccountManagerAccessContract.canRestore,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
          },
        );

        return { canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class ManagerAccessMutations extends Effect.Service<ManagerAccessMutations>()(
    "@printdesk/core/shared-accounts/client/ManagerAccessMutations",
    {
      accessors: true,
      dependencies: [
        ManagerAccessWriteRepository.Default,
        ManagerAccessPolicies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAccessWriteRepository;

        const policies = yield* ManagerAccessPolicies;

        const create = MutationsContract.makeMutation(
          SharedAccountManagerAccessContract.create,
          {
            makePolicy: () =>
              AccessControl.permission("shared_account_manager_access:create"),
            mutator: (access, { tenantId }) =>
              repository.create(
                SharedAccountManagerAccessContract.DataTransferObject.make({
                  ...access,
                  tenantId,
                }),
              ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          SharedAccountManagerAccessContract.delete_,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_access:delete",
                ),
                policies.canDelete.make({ id }),
              ),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission(
                      "shared_account_manager_access:read",
                    ),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        const restore = MutationsContract.makeMutation(
          SharedAccountManagerAccessContract.restore,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_access:delete",
                ),
                policies.canRestore.make({ id }),
              ),
            mutator: ({ id }) =>
              repository.updateById(id, () => ({ deletedAt: null })),
          },
        );

        return { create, delete: delete_, restore } as const;
      }),
    },
  ) {}

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/shared-accounts/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
        CustomerAccessReadRepository.Default,
        ManagerAccessReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const base = yield* table.pipe(
          Effect.flatMap(Replicache.makeReadRepository),
        );

        const customerAccessRepository = yield* CustomerAccessReadRepository;
        const managerAccessRepository = yield* ManagerAccessReadRepository;

        const findActiveAuthorizedCustomerIds = (
          id: SharedAccountsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((sharedAccount) =>
                customerAccessRepository.findWhere(
                  Array.filterMap((access) =>
                    access.sharedAccountId === sharedAccount.id &&
                    access.deletedAt === null
                      ? Option.some(access.customerId)
                      : Option.none(),
                  ),
                ),
              ),
            );

        const findActiveAuthorizedManagerIds = (
          id: SharedAccountsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((sharedAccount) =>
                managerAccessRepository.findWhere(
                  Array.filterMap((access) =>
                    access.sharedAccountId === sharedAccount.id &&
                    access.deletedAt === null
                      ? Option.some(access.managerId)
                      : Option.none(),
                  ),
                ),
              ),
            );

        return {
          ...base,
          findActiveAuthorizedCustomerIds,
          findActiveAuthorizedManagerIds,
        };
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/shared-accounts/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([table, ReadRepository]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/shared-accounts/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const isCustomerAuthorized = PoliciesContract.makePolicy(
          SharedAccountsContract.isCustomerAuthorized,
          {
            make: ({ id, customerId }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedCustomerIds(id)
                  .pipe(
                    Effect.map(
                      Array.some(Equal.equals(customerId ?? principal.userId)),
                    ),
                  ),
              ),
          },
        );

        const isManagerAuthorized = PoliciesContract.makePolicy(
          SharedAccountsContract.isManagerAuthorized,
          {
            make: ({ id, managerId }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedManagerIds(id)
                  .pipe(
                    Effect.map(
                      Array.some(Equal.equals(managerId ?? principal.userId)),
                    ),
                  ),
              ),
          },
        );

        const canEdit = PoliciesContract.makePolicy(
          SharedAccountsContract.canEdit,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          SharedAccountsContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = PoliciesContract.makePolicy(
          SharedAccountsContract.canRestore,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
          },
        );

        return {
          isCustomerAuthorized,
          isManagerAuthorized,
          canEdit,
          canDelete,
          canRestore,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/shared-accounts/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const policies = yield* Policies;

        const edit = MutationsContract.makeMutation(
          SharedAccountsContract.edit,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("shared_accounts:update"),
                policies.canEdit.make({ id }),
              ),
            mutator: ({ id, ...sharedAccount }) =>
              repository.updateById(id, () => sharedAccount),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          SharedAccountsContract.delete_,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.every(
                  AccessControl.permission("shared_accounts:delete"),
                  policies.canDelete.make({ id }),
                ),
              ),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("shared_accounts:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        const restore = MutationsContract.makeMutation(
          SharedAccountsContract.restore,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("shared_accounts:delete"),
                policies.canRestore.make({ id }),
              ),
            mutator: ({ id }) =>
              repository.updateById(id, () => ({ deletedAt: null })),
          },
        );

        return { edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
