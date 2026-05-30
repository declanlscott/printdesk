import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { UsersSync } from ".";
import { AccessControl } from "../../access-control";
import { Sync } from "../../sync";
import { UsersRepository } from "../repository";
import { users } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* UsersRepository;

  const streamer = new Sync.EntityStreamerBuilder(users.name)
    .source(AccessControl.userPermissionPolicy("users:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_users:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(UsersSync));
