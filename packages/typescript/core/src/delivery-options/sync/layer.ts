import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { DeliveryOptionsSync } from ".";
import { AccessControl } from "../../access-control";
import { SyncContract } from "../../sync/contract";
import { DeliveryOptionsRepository } from "../repository";
import { deliveryOptions } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* DeliveryOptionsRepository;

  const streamer = new SyncContract.EntityStreamerBuilder(deliveryOptions.name)
    .source(AccessControl.userPermissionPolicy("delivery_options:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_delivery_options:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_published_room_delivery_options:read"), {
      findCreates: repository.findActivePublishedRoomCreates,
      findUpdates: repository.findActivePublishedRoomUpdates,
      findDeletes: repository.findActivePublishedRoomDeletes,
      fastForward: repository.findActivePublishedRoomFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(DeliveryOptionsSync));
