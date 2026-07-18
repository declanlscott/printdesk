import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { GroupsPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Policy } from "../../../policies";
import { GroupsContract } from "../../contracts";
import { GroupMembershipsReadRepository } from "../memberships/repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const membershipsRepository = yield* GroupMembershipsReadRepository;

  const isMemberOf = Policy.make(GroupsContract.isMemberOf, {
    make: ({ id, userId }) =>
      AccessControl.userPolicy(
        (user) =>
          membershipsRepository
            .findActiveByIds(id, userId.pipe(Option.getOrElse(() => user.id)))
            .pipe(Effect.mapBoth({ onSuccess: () => true, onFailure: () => false })),
        { name: GroupsContract.Table.name, id },
      ),
  });

  return { isMemberOf } as const;
});

export const layer = makeService.pipe(Layer.effect(GroupsPolicies));
