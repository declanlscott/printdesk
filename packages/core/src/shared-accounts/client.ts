import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Actors } from "../actors";
import { ActorsContract } from "../actors/contract";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { Users } from "../users/client";
import {
  SharedAccountCustomerAccessContract,
  SharedAccountCustomerGroupAccessContract,
  SharedAccountManagerAccessContract,
  SharedAccountsContract,
} from "./contracts";

export namespace SharedAccounts {
  const customerAccessTable =
    Models.syncTables[SharedAccountCustomerAccessContract.tableName];
  const managerAccessTable =
    Models.syncTables[SharedAccountManagerAccessContract.tableName];
  const customerGroupAccessTable =
    Models.syncTables[SharedAccountCustomerGroupAccessContract.tableName];
  const table = Models.syncTables[SharedAccountsContract.tableName];

  export class CustomerAccessReadRepository extends Effect.Service<CustomerAccessReadRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAccessReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(customerAccessTable),
    },
  ) {}

  export class CustomerAccessWriteRepository extends Effect.Service<CustomerAccessWriteRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAccessWriteRepository",
    {
      accessors: true,
      dependencies: [
        CustomerAccessReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: CustomerAccessReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(customerAccessTable, repository),
        ),
      ),
    },
  ) {}

  export class ManagerAccessReadRepository extends Effect.Service<ManagerAccessReadRepository>()(
    "@printdesk/core/shared-accounts/client/ManagerAccessReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(managerAccessTable),
    },
  ) {}

  export class ManagerAccessWriteRepository extends Effect.Service<ManagerAccessWriteRepository>()(
    "@printdesk/core/shared-accounts/client/ManagerAccessWriteRepository",
    {
      accessors: true,
      dependencies: [
        ManagerAccessReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ManagerAccessReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(managerAccessTable, repository),
        ),
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
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNull),
                AccessControl.policy({
                  name: SharedAccountManagerAccessContract.tableName,
                  id,
                }),
              ),
          },
        );

        const canRestore = PoliciesContract.makePolicy(
          SharedAccountManagerAccessContract.canRestore,
          {
            make: ({ id }) =>
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNotNull),
                AccessControl.policy({
                  name: SharedAccountManagerAccessContract.tableName,
                  id,
                }),
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

  export class CustomerGroupAccessReadRepository extends Effect.Service<CustomerGroupAccessReadRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerGroupAccessReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(customerGroupAccessTable),
    },
  ) {}

  export class CustomerGroupAccessWriteRepository extends Effect.Service<CustomerGroupAccessWriteRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerGroupAccessWriteRepository",
    {
      accessors: true,
      dependencies: [
        CustomerGroupAccessReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: CustomerGroupAccessReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(customerGroupAccessTable, repository),
        ),
      ),
    },
  ) {}

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/shared-accounts/client/ReadRepository",
    {
      dependencies: [
        Replicache.ReadTransactionManager.Default,
        CustomerAccessReadRepository.Default,
        ManagerAccessReadRepository.Default,
        CustomerGroupAccessReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(table);

        const customerAccessRepository = yield* CustomerAccessReadRepository;
        const managerAccessRepository = yield* ManagerAccessReadRepository;
        const customerGroupAccessRepository =
          yield* CustomerGroupAccessReadRepository;

        const findActiveAuthorizedCustomerIds = (
          id: SharedAccountsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((sharedAccount) =>
                customerAccessRepository.findWhere((access) =>
                  access.sharedAccountId === sharedAccount.id &&
                  access.deletedAt === null
                    ? Option.some(access.customerId)
                    : Option.none(),
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
                managerAccessRepository.findWhere((access) =>
                  access.sharedAccountId === sharedAccount.id &&
                  access.deletedAt === null
                    ? Option.some(access.managerId)
                    : Option.none(),
                ),
              ),
            );

        const findActiveAuthorizedCustomerGroupIds = (
          id: SharedAccountsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((sharedAccount) =>
                customerGroupAccessRepository.findWhere((access) =>
                  access.sharedAccountId === sharedAccount.id &&
                  access.deletedAt === null
                    ? Option.some(access.customerGroupId)
                    : Option.none(),
                ),
              ),
            );

        return {
          ...base,
          findActiveAuthorizedCustomerIds,
          findActiveAuthorizedManagerIds,
          findActiveAuthorizedCustomerGroupIds,
        };
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/shared-accounts/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(table, repository),
        ),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/shared-accounts/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default, Users.ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;
        const usersRepository = yield* Users.ReadRepository;

        const isCustomerAuthorized = PoliciesContract.makePolicy(
          SharedAccountsContract.isCustomerAuthorized,
          {
            make: ({ id, customerId }) => {
              const policy = AccessControl.userPolicy(
                {
                  name: SharedAccountsContract.tableName,
                  id,
                },
                (user) =>
                  repository
                    .findActiveAuthorizedCustomerIds(id)
                    .pipe(Effect.map(Array.some(Equal.equals(user.id)))),
              );

              return customerId.pipe(
                Option.match({
                  onSome: (customerId) =>
                    policy.pipe(
                      Effect.provideServiceEffect(
                        Actors.Actor,
                        usersRepository.findById(customerId).pipe(
                          Effect.map(
                            (user) =>
                              new ActorsContract.Actor({
                                properties: new ActorsContract.UserActor(user),
                              }),
                          ),
                        ),
                      ),
                    ),
                  onNone: () => policy,
                }),
              );
            },
          },
        );

        const isManagerAuthorized = PoliciesContract.makePolicy(
          SharedAccountsContract.isManagerAuthorized,
          {
            make: ({ id, managerId }) => {
              const policy = AccessControl.userPolicy(
                {
                  name: SharedAccountsContract.tableName,
                  id,
                },
                (user) =>
                  repository
                    .findActiveAuthorizedManagerIds(id)
                    .pipe(Effect.map(Array.some(Equal.equals(user.id)))),
              );

              return managerId.pipe(
                Option.match({
                  onSome: (managerId) =>
                    policy.pipe(
                      Effect.provideServiceEffect(
                        Actors.Actor,
                        usersRepository.findById(managerId).pipe(
                          Effect.map(
                            (user) =>
                              new ActorsContract.Actor({
                                properties: new ActorsContract.UserActor(user),
                              }),
                          ),
                        ),
                      ),
                    ),
                  onNone: () => policy,
                }),
              );
            },
          },
        );

        const canEdit = PoliciesContract.makePolicy(
          SharedAccountsContract.canEdit,
          {
            make: ({ id }) =>
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNull),
                AccessControl.policy({
                  name: SharedAccountsContract.tableName,
                  id,
                }),
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
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNotNull),
                AccessControl.policy({
                  name: SharedAccountsContract.tableName,
                  id,
                }),
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
