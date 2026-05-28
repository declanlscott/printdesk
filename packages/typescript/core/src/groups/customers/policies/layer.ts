import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { CustomerGroupsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { PoliciesContract } from "../../../policies/contract";
import { CustomerGroupsContract } from "../../contracts";
import { CustomerGroupsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CustomerGroupsRepository;

  const isMemberOf = PoliciesContract.makePolicy(CustomerGroupsContract.isMemberOf, {
    make: Effect.fn("Groups.CustomersPolicies.isMemberOf.make")(({ id, memberId }) =>
      AccessControl.userPolicy({ name: CustomerGroupsContract.Table.name, id }, (user) =>
        repository
          .findActiveMemberIds(id, user.tenantId)
          .pipe(
            Effect.map(Array.some(Equal.equals(memberId.pipe(Option.getOrElse(() => user.id))))),
          ),
      ),
    ),
  });

  return { isMemberOf } as const;
});

export const layer = makeService.pipe(Layer.effect(CustomerGroupsPolicies));
