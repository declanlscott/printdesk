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
  SharedAccountCustomerAuthorizationsContract,
  SharedAccountManagerAuthorizationsContract,
  SharedAccountsContract,
} from "./contracts";

export namespace SharedAccounts {
  const customerAuthorizationsTable =
    Models.SyncTables[SharedAccountCustomerAuthorizationsContract.tableName];
  const managerAuthorizationsTable =
    Models.SyncTables[SharedAccountManagerAuthorizationsContract.tableName];
  const table = Models.SyncTables[SharedAccountsContract.tableName];

  export class CustomerAuthorizationsReadRepository extends Effect.Service<CustomerAuthorizationsReadRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAuthorizationsReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: customerAuthorizationsTable.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class CustomerAuthorizationsWriteRepository extends Effect.Service<CustomerAuthorizationsWriteRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAuthorizationsWriteRepository",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        CustomerAuthorizationsReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        customerAuthorizationsTable,
        CustomerAuthorizationsReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class ManagerAuthorizationsReadRepository extends Effect.Service<ManagerAuthorizationsReadRepository>()(
    "@printdesk/core/shared-accounts/client/ManagerAuthorizationsReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: managerAuthorizationsTable.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class ManagerAuthorizationsWriteRepository extends Effect.Service<ManagerAuthorizationsWriteRepository>()(
    "@printdesk/core/shared-accounts/client/ManagerAuthorizationsWriteRepository",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        ManagerAuthorizationsReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        managerAuthorizationsTable,
        ManagerAuthorizationsReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class ManagerAuthorizationPolicies extends Effect.Service<ManagerAuthorizationPolicies>()(
    "@printdesk/core/shared-accounts/ManagerAuthorizationPolicies",
    {
      accessors: true,
      dependencies: [ManagerAuthorizationsReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsReadRepository;

        const canDelete = PoliciesContract.makePolicy(
          SharedAccountManagerAuthorizationsContract.canDelete,
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
          SharedAccountManagerAuthorizationsContract.canRestore,
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

  export class ManagerAuthorizationMutations extends Effect.Service<ManagerAuthorizationMutations>()(
    "@printdesk/core/shared-accounts/client/ManagerAuthorizationMutations",
    {
      accessors: true,
      dependencies: [
        ManagerAuthorizationsWriteRepository.Default,
        ManagerAuthorizationPolicies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsWriteRepository;

        const policies = yield* ManagerAuthorizationPolicies;

        const create = MutationsContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.create,
          {
            makePolicy: () =>
              AccessControl.permission(
                "shared_account_manager_authorizations:create",
              ),
            mutator: (authorization, { tenantId }) =>
              repository.create(
                SharedAccountManagerAuthorizationsContract.DataTransferObject.make(
                  { ...authorization, tenantId },
                ),
              ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.delete_,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_authorizations:delete",
                ),
                policies.canDelete.make({ id }),
              ),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission(
                      "shared_account_manager_authorizations:read",
                    ),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        const restore = MutationsContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.restore,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission(
                  "shared_account_manager_authorizations:delete",
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
        CustomerAuthorizationsReadRepository.Default,
        ManagerAuthorizationsReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const base = yield* table.pipe(
          Effect.flatMap(Replicache.makeReadRepository),
        );

        const customerAuthorizationsRepository =
          yield* CustomerAuthorizationsReadRepository;
        const managerAuthorizationsRepository =
          yield* ManagerAuthorizationsReadRepository;

        const findActiveAuthorizedCustomerIds = (
          id: SharedAccountsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((sharedAccount) =>
                customerAuthorizationsRepository.findWhere(
                  Array.filterMap((authorization) =>
                    authorization.sharedAccountId === sharedAccount.id &&
                    authorization.deletedAt === null
                      ? Option.some(authorization.customerId)
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
                managerAuthorizationsRepository.findWhere(
                  Array.filterMap((authorization) =>
                    authorization.sharedAccountId === sharedAccount.id &&
                    authorization.deletedAt === null
                      ? Option.some(authorization.managerId)
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
