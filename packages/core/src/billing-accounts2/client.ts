import { Array, Effect, Equal, Option, Predicate } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import {
  BillingAccountCustomerAuthorizationsContract,
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "./contracts";

export namespace BillingAccounts {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/billing-accounts/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(
          BillingAccountsContract.table,
        );
        const { get, scan } = yield* Replicache.ReadTransactionManager;

        const findActiveAuthorizedManagerIds = (
          id: typeof BillingAccountsContract.table.Schema.Type.id,
        ) =>
          get(BillingAccountsContract.table, id).pipe(
            Effect.flatMap((billingAccount) =>
              scan(BillingAccountManagerAuthorizationsContract.table).pipe(
                Effect.map(
                  Array.filterMap((authorization) =>
                    Equal.equals(
                      authorization.billingAccountId,
                      billingAccount.id,
                    ) && Predicate.isNotNull(authorization.deletedAt)
                      ? Option.some(authorization.managerId)
                      : Option.none(),
                  ),
                ),
              ),
            ),
          );

        const findActiveAuthorizedCustomerIds = (
          id: typeof BillingAccountsContract.table.Schema.Type.id,
        ) =>
          get(BillingAccountsContract.table, id).pipe(
            Effect.flatMap((billingAccount) =>
              scan(BillingAccountCustomerAuthorizationsContract.table).pipe(
                Effect.map(
                  Array.filterMap((authorization) =>
                    Equal.equals(
                      authorization.billingAccountId,
                      billingAccount.id,
                    ) && Predicate.isNotNull(authorization.deletedAt)
                      ? Option.some(authorization.customerId)
                      : Option.none(),
                  ),
                ),
              ),
            ),
          );

        const findActiveAuthorizedUserIds = (
          id: typeof BillingAccountsContract.table.Schema.Type.id,
        ) =>
          get(BillingAccountsContract.table, id).pipe(
            Effect.flatMap((billingAccount) =>
              Effect.all(
                [
                  scan(BillingAccountCustomerAuthorizationsContract.table).pipe(
                    Effect.map(
                      Array.filterMap((authorization) =>
                        Equal.equals(
                          authorization.billingAccountId,
                          billingAccount.id,
                        ) && Predicate.isNotNull(authorization.deletedAt)
                          ? Option.some(authorization.customerId)
                          : Option.none(),
                      ),
                    ),
                  ),
                  scan(BillingAccountManagerAuthorizationsContract.table).pipe(
                    Effect.map(
                      Array.filterMap((authorization) =>
                        Equal.equals(
                          authorization.billingAccountId,
                          billingAccount.id,
                        ) && Predicate.isNotNull(authorization.deletedAt)
                          ? Option.some(authorization.managerId)
                          : Option.none(),
                      ),
                    ),
                  ),
                ],
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Array.flatten)),
            ),
          );

        return {
          ...base,
          findActiveAuthorizedCustomerIds,
          findActiveAuthorizedManagerIds,
          findActiveAuthorizedUserIds,
        };
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/billing-accounts/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(
            BillingAccountsContract.table,
            repository,
          ),
        ),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/billing-accounts/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const hasActiveManagerAuthorization = DataAccessContract.makePolicy(
          BillingAccountsContract.hasActiveManagerAuthorization,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedManagerIds(id)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
          }),
        );

        const hasActiveCustomerAuthorization = DataAccessContract.makePolicy(
          BillingAccountsContract.hasActiveCustomerAuthorization,
          Effect.succeed({
            make: ({ id, customerId }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedManagerIds(id)
                  .pipe(
                    Effect.map(
                      Array.some(Equal.equals(customerId ?? principal.userId)),
                    ),
                  ),
              ),
          }),
        );

        const hasActiveAuthorization = DataAccessContract.makePolicy(
          BillingAccountsContract.hasActiveAuthorization,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveAuthorizedUserIds(id)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
          }),
        );

        return {
          hasActiveManagerAuthorization,
          hasActiveCustomerAuthorization,
          hasActiveAuthorization,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/billing-accounts/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const update = DataAccessContract.makeMutation(
          BillingAccountsContract.update,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("billing_accounts:update"),
            mutator: ({ id, ...billingAccount }) =>
              repository.updateById(id, billingAccount),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          BillingAccountsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("billing_accounts:delete"),
            mutator: ({ id, deletedAt }) =>
              repository.updateById(id, { deletedAt }).pipe(
                AccessControl.enforce(
                  AccessControl.permission("billing_accounts:read"),
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
    "@printdesk/core/billing-accounts/client/CustomerAuthorizationsReadRepository",
    {
      effect: Replicache.makeReadRepository(
        BillingAccountCustomerAuthorizationsContract.table,
      ),
    },
  ) {}

  export class CustomerAuthorizationsWriteRepository extends Effect.Service<CustomerAuthorizationsWriteRepository>()(
    "@printdesk/core/billing-accounts/client/CustomerAuthorizationsWriteRepository",
    {
      dependencies: [CustomerAuthorizationsReadRepository.Default],
      effect: CustomerAuthorizationsReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(
            BillingAccountCustomerAuthorizationsContract.table,
            repository,
          ),
        ),
      ),
    },
  ) {}

  export class ManagerAuthorizationsReadRepository extends Effect.Service<ManagerAuthorizationsReadRepository>()(
    "@printdesk/core/billing-accounts/client/ManagerAuthorizationsReadRepository",
    {
      effect: Replicache.makeReadRepository(
        BillingAccountManagerAuthorizationsContract.table,
      ),
    },
  ) {}

  export class ManagerAuthorizationsWriteRepository extends Effect.Service<ManagerAuthorizationsWriteRepository>()(
    "@printdesk/core/billing-accounts/client/ManagerAuthorizationsWriteRepository",
    {
      dependencies: [ManagerAuthorizationsReadRepository.Default],
      effect: ManagerAuthorizationsReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(
            BillingAccountManagerAuthorizationsContract.table,
            repository,
          ),
        ),
      ),
    },
  ) {}

  export class ManagerAuthorizationMutations extends Effect.Service<ManagerAuthorizationMutations>()(
    "@printdesk/core/billing-accounts/client/ManagerAuthorizationMutations",
    {
      dependencies: [ManagerAuthorizationsWriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ManagerAuthorizationsWriteRepository;

        const create = DataAccessContract.makeMutation(
          BillingAccountManagerAuthorizationsContract.create,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission(
                "billing_account_manager_authorizations:create",
              ),
            mutator: (authorization, { tenantId }) =>
              repository.create(
                BillingAccountManagerAuthorizationsContract.table.Schema.make({
                  ...authorization,
                  tenantId,
                }),
              ),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          BillingAccountManagerAuthorizationsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission(
                "billing_account_manager_authorizations:delete",
              ),
            mutator: ({ id, deletedAt }) =>
              repository.updateById(id, { deletedAt }).pipe(
                AccessControl.enforce(
                  AccessControl.permission(
                    "billing_account_manager_authorizations:read",
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
