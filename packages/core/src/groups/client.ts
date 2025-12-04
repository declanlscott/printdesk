import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Option from "effect/Option";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import {
  CustomerGroupMembershipsContract,
  CustomerGroupsContract,
} from "./contracts";

export namespace Groups {
  const table = Models.syncTables[CustomerGroupsContract.tableName];
  const membershipsTable =
    Models.syncTables[CustomerGroupMembershipsContract.tableName];

  export class CustomerMembershipsReadRepository extends Effect.Service<CustomerMembershipsReadRepository>()(
    "@printdesk/core/groups/client/CustomerMembershipsReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(membershipsTable),
    },
  ) {}

  export class CustomersReadRepository extends Effect.Service<CustomersReadRepository>()(
    "@printdesk/core/groups/client/CustomersReadRepository",
    {
      dependencies: [
        Replicache.ReadTransactionManager.Default,
        CustomerMembershipsReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(table);

        const membershipsRepository = yield* CustomerMembershipsReadRepository;

        const findActiveMemberIds = (
          id: CustomerGroupsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((group) =>
                membershipsRepository.findWhere((membership) =>
                  membership.customerGroupId === group.id &&
                  membership.deletedAt === null
                    ? Option.some(membership.memberId)
                    : Option.none(),
                ),
              ),
            );

        return { ...base, findActiveMemberIds } as const;
      }),
    },
  ) {}

  export class CustomersPolicies extends Effect.Service<CustomersPolicies>()(
    "@printdesk/core/groups/client/CustomersPolicies",
    {
      accessors: true,
      dependencies: [CustomersReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* CustomersReadRepository;

        const isMemberOf = PoliciesContract.makePolicy(
          CustomerGroupsContract.isMemberOf,
          {
            make: ({ id, memberId }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveMemberIds(id)
                  .pipe(
                    Effect.map(
                      Array.some(Equal.equals(memberId ?? principal.userId)),
                    ),
                  ),
              ),
          },
        );

        return { isMemberOf } as const;
      }),
    },
  ) {}
}
