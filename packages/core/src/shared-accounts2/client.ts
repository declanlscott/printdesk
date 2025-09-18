import { Array, Effect, Equal, Option, Predicate } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
import { Replicache } from "../replicache2/client";
import {
  SharedAccountManagerAuthorizationsContract,
  SharedAccountsContract,
} from "./contracts";

export namespace SharedAccounts {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/shared-accounts/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const table = yield* Models.SyncTables.sharedAccounts;
        const base = yield* Replicache.makeReadRepository(table);
        const { get, scan } = yield* Replicache.ReadTransactionManager;

        const customerAuthorizationsTable =
          yield* Models.SyncTables.sharedAccountCustomerAuthorizations;
        const managerAuthorizationsTable =
          yield* Models.SyncTables.sharedAccountManagerAuthorizations;

        const findActiveAuthorizedCustomerIds = (
          id: SharedAccountsContract.DataTransferObject["id"],
        ) =>
          get(table, id).pipe(
            Effect.flatMap((sharedAccount) =>
              scan(customerAuthorizationsTable).pipe(
                Effect.map(
                  Array.filterMap((authorization) =>
                    Equal.equals(
                      authorization.sharedAccountId,
                      sharedAccount.id,
                    ) && Predicate.isNotNull(authorization.deletedAt)
                      ? Option.some(authorization.customerId)
                      : Option.none(),
                  ),
                ),
              ),
            ),
          );

        const findActiveAuthorizedManagerIds = (
          id: SharedAccountsContract.DataTransferObject["id"],
        ) =>
          get(table, id).pipe(
            Effect.flatMap((sharedAccount) =>
              scan(managerAuthorizationsTable).pipe(
                Effect.map(
                  Array.filterMap((authorization) =>
                    Equal.equals(
                      authorization.sharedAccountId,
                      sharedAccount.id,
                    ) && Predicate.isNotNull(authorization.deletedAt)
                      ? Option.some(authorization.managerId)
                      : Option.none(),
                  ),
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
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        Models.SyncTables.sharedAccounts,
        ReadRepository,
      ]).pipe(
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

        const isCustomerAuthorized = DataAccessContract.makePolicy(
          SharedAccountsContract.isCustomerAuthorized,
          Effect.succeed({
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
          }),
        );

        const isManagerAuthorized = DataAccessContract.makePolicy(
          SharedAccountsContract.isManagerAuthorized,
          Effect.succeed({
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
          }),
        );

        return { isCustomerAuthorized, isManagerAuthorized } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/shared-accounts/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const update = DataAccessContract.makeMutation(
          SharedAccountsContract.update,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("shared_accounts:update"),
            mutator: ({ id, ...sharedAccount }) =>
              repository.updateById(id, () => sharedAccount),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          SharedAccountsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("shared_accounts:delete"),
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
          }),
        );

        return { update, delete: delete_ } as const;
      }),
    },
  ) {}

  export class CustomerAuthorizationsReadRepository extends Effect.Service<CustomerAuthorizationsReadRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAuthorizationsReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.sharedAccountCustomerAuthorizations.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class CustomerAuthorizationsWriteRepository extends Effect.Service<CustomerAuthorizationsWriteRepository>()(
    "@printdesk/core/shared-accounts/client/CustomerAuthorizationsWriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        CustomerAuthorizationsReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        Models.SyncTables.sharedAccountCustomerAuthorizations,
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
      effect: Models.SyncTables.sharedAccountManagerAuthorizations.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class ManagerAuthorizationsWriteRepository extends Effect.Service<ManagerAuthorizationsWriteRepository>()(
    "@printdesk/core/shared-accounts/client/ManagerAuthorizationsWriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ManagerAuthorizationsReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        Models.SyncTables.sharedAccountManagerAuthorizations,
        ManagerAuthorizationsReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class ManagerAuthorizationMutations extends Effect.Service<ManagerAuthorizationMutations>()(
    "@printdesk/core/shared-accounts/client/ManagerAuthorizationMutations",
    {
      accessors: true,
      dependencies: [ManagerAuthorizationsWriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsWriteRepository;

        const create = DataAccessContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.create,
          Effect.succeed({
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
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          SharedAccountManagerAuthorizationsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission(
                "shared_account_manager_authorizations:delete",
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
          }),
        );

        return { create, delete: delete_ } as const;
      }),
    },
  ) {}
}
