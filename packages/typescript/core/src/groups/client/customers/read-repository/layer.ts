import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { CustomerGroupsReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { CustomerGroupsContract } from "../../../contracts";
import { CustomerGroupMembershipsReadRepository } from "../../customer-memberships/read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const base = yield* makeReadRepository(CustomerGroupsContract.Table);

  const membershipsRepository = yield* CustomerGroupMembershipsReadRepository;

  const findActiveMemberIds = (id: (typeof CustomerGroupsContract.Table.Model.Type)["id"]) =>
    base
      .findById(id)
      .pipe(
        Effect.flatMap((group) =>
          membershipsRepository.findWhere((membership) =>
            membership.customerGroupId === group.id && membership.deletedAt === null
              ? Result.succeed(membership.memberId)
              : Result.failVoid,
          ),
        ),
      );

  return { ...base, findActiveMemberIds } as const;
});

export const layer = makeService.pipe(Layer.effect(CustomerGroupsReadRepository));
