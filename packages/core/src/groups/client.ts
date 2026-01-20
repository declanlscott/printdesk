import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Option from "effect/Option";

import { AccessControl } from "../access-control";
import { Actors } from "../actors";
import { ActorsContract } from "../actors/contract";
import { Models } from "../models";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { Users } from "../users/client";
import {
  CustomerGroupMembershipsContract,
  CustomerGroupsContract,
} from "./contracts";

export namespace Groups {
  const Table = Models.syncTables[CustomerGroupsContract.Table.name];
  const MembershipsTable =
    Models.syncTables[CustomerGroupMembershipsContract.Table.name];

  export class CustomerMembershipsReadRepository extends Effect.Service<CustomerMembershipsReadRepository>()(
    "@printdesk/core/groups/client/CustomerMembershipsReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(MembershipsTable),
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
        const base = yield* Replicache.makeReadRepository(Table);

        const membershipsRepository = yield* CustomerMembershipsReadRepository;

        const findActiveMemberIds = (
          id: (typeof CustomerGroupsContract.Table.DataTransferObject.Type)["id"],
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
      dependencies: [
        CustomersReadRepository.Default,
        Users.ReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* CustomersReadRepository;
        const usersRepository = yield* Users.ReadRepository;

        const isMemberOf = PoliciesContract.makePolicy(
          CustomerGroupsContract.isMemberOf,
          {
            make: ({ id, memberId }) => {
              const policy = AccessControl.userPolicy(
                {
                  name: CustomerGroupsContract.Table.name,
                  id,
                },
                (user) =>
                  repository
                    .findActiveMemberIds(id)
                    .pipe(Effect.map(Array.some(Equal.equals(user.id)))),
              );

              return memberId.pipe(
                Option.match({
                  onSome: (memberId) =>
                    policy.pipe(
                      Effect.provideServiceEffect(
                        Actors.Actor,
                        usersRepository.findById(memberId).pipe(
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

        return { isMemberOf } as const;
      }),
    },
  ) {}
}
