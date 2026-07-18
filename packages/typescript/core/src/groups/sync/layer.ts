import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { GroupsSync } from ".";
import { AccessControl } from "../../access-control";
import { Sync } from "../../sync";
import { GroupsSyncRepository } from "../repositories";
import { groups } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* GroupsSyncRepository;

  const streamer = new Sync.EntityStreamerBuilder(groups.name)
    .source(AccessControl.userPermissionPolicy("groups:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_groups:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_membership_groups:read"), {
      findCreates: repository.findActiveMembershipCreates,
      findUpdates: repository.findActiveMembershipUpdates,
      findDeletes: repository.findActiveMembershipDeletes,
      fastForward: repository.findActiveMembershipFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(GroupsSync));
