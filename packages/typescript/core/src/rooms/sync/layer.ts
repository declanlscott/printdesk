import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomsSync } from ".";
import { AccessControl } from "../../access-control";
import { Sync } from "../../sync";
import { RoomsRepository } from "../repository";
import { rooms } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomsRepository;

  const streamer = new Sync.EntityStreamerBuilder(rooms.name)
    .source(AccessControl.userPermissionPolicy("rooms:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_rooms:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_published_rooms:read"), {
      findCreates: repository.findActivePublishedCreates,
      findUpdates: repository.findActivePublishedUpdates,
      findDeletes: repository.findActivePublishedDeletes,
      fastForward: repository.findActivePublishedFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomsSync));
