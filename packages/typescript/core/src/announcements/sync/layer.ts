import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AnnouncementsSync } from ".";
import { AccessControl } from "../../access-control";
import { SyncContract } from "../../sync/contract";
import { AnnouncementsRepository } from "../repository";
import { announcements } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* AnnouncementsRepository;

  const streamer = new SyncContract.EntityStreamerBuilder(announcements.name)
    .source(AccessControl.userPermissionPolicy("announcements:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_announcements:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_published_room_announcements:read"), {
      findCreates: repository.findActivePublishedRoomCreates,
      findUpdates: repository.findActivePublishedRoomUpdates,
      findDeletes: repository.findActivePublishedRoomDeletes,
      fastForward: repository.findActivePublishedRoomFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsSync));
