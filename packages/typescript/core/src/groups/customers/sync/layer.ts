import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CustomerGroupsSync } from ".";
import { AccessControl } from "../../../access-control";
import { SyncContract } from "../../../sync/contract";
import { customerGroups } from "../../sql";
import { CustomerGroupsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* CustomerGroupsRepository;

  const streamer = new SyncContract.EntityStreamerBuilder(customerGroups.name)
    .source(AccessControl.userPermissionPolicy("customer_groups:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_customer_groups:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_membership_customer_groups:read"), {
      findCreates: repository.findActiveMembershipCreates,
      findUpdates: repository.findActiveMembershipUpdates,
      findDeletes: repository.findActiveMembershipDeletes,
      fastForward: repository.findActiveMembershipFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(CustomerGroupsSync));
