import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { GroupMembershipsSync } from ".";
import { AccessControl } from "../../../access-control";
import { Sync } from "../../../sync";
import { groupMemberships } from "../../sql";
import { GroupMembershipsSyncRepository } from "../repositories";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* GroupMembershipsSyncRepository;

  const streamer = new Sync.EntityStreamerBuilder(groupMemberships.name)
    .source(AccessControl.userPermissionPolicy("group_memberships:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_group_memberships:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(GroupMembershipsSync));
