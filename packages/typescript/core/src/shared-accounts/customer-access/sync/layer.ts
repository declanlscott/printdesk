import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountCustomerAccessSync } from ".";
import { AccessControl } from "../../../access-control";
import { SyncContract } from "../../../sync/contract";
import { sharedAccountCustomerAccess } from "../../sql";
import { SharedAccountCustomerAccessRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountCustomerAccessRepository;

  const streamer = new SyncContract.EntityStreamerBuilder(sharedAccountCustomerAccess.name)
    .source(AccessControl.userPermissionPolicy("shared_account_customer_access:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_shared_account_customer_access:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(
      AccessControl.userPermissionPolicy("active_authorized_shared_account_customer_access:read"),
      {
        findCreates: repository.findActiveAuthorizedCreates,
        findUpdates: repository.findActiveAuthorizedUpdates,
        findDeletes: repository.findActiveAuthorizedDeletes,
        fastForward: repository.findActiveAuthorizedFastForward,
      },
    )
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountCustomerAccessSync));
