import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomWorkflowsSync } from ".";
import { AccessControl } from "../../../access-control";
import { Sync } from "../../../sync";
import { roomWorkflows } from "../../sql";
import { RoomWorkflowsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* RoomWorkflowsRepository;

  const streamer = new Sync.EntityStreamerBuilder(roomWorkflows.name)
    .source(AccessControl.userPermissionPolicy("room_workflows:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_room_workflows:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_published_room_room_workflows:read"), {
      findCreates: repository.findActivePublishedRoomCreates,
      findUpdates: repository.findActivePublishedRoomUpdates,
      findDeletes: repository.findActivePublishedRoomDeletes,
      fastForward: repository.findActivePublishedRoomFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomWorkflowsSync));
