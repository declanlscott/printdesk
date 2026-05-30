import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CustomerGroupMembershipsSync } from ".";
import { AccessControl } from "../../../access-control";
import { Sync } from "../../../sync";
import { customerGroupMemberships } from "../../sql";
import { CustomerGroupMembershipsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CustomerGroupMembershipsRepository;

  const streamer = new Sync.EntityStreamerBuilder(customerGroupMemberships.name)
    .source(AccessControl.userPermissionPolicy("customer_group_memberships:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_customer_group_memberships:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(CustomerGroupMembershipsSync));
