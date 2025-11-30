import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Option from "effect/Option";

import { AccessControl } from "../access-control2";
import { Models } from "../models2";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache2/client";
import {
  CustomerGroupMembershipsContract,
  CustomerGroupsContract,
} from "./contracts";

export namespace Groups {
  const table = Models.SyncTables[CustomerGroupsContract.tableName];
  const membershipsTable =
    Models.SyncTables[CustomerGroupMembershipsContract.tableName];

  export class CustomerMembershipsReadRepository extends Effect.Service<CustomerMembershipsReadRepository>()(
    "@printdesk/core/groups/client/CustomerMembershipsReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: membershipsTable.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class CustomersReadRepository extends Effect.Service<CustomersReadRepository>()(
    "@printdesk/core/groups/client/CustomersReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
        CustomerMembershipsReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const base = yield* table.pipe(
          Effect.flatMap(Replicache.makeReadRepository),
        );

        const membershipsRepository = yield* CustomerMembershipsReadRepository;

        const findActiveMemberIds = (
          id: CustomerGroupsContract.DataTransferObject["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((group) =>
                membershipsRepository.findWhere(
                  Array.filterMap((membership) =>
                    membership.groupId === group.id &&
                    membership.deletedAt === null
                      ? Option.some(membership.memberId)
                      : Option.none(),
                  ),
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
