import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { TenantsSync } from ".";
import { AccessControl } from "../../access-control";
import { Sync } from "../../sync";
import { TenantsSyncRepository } from "../repositories";
import { tenants } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* TenantsSyncRepository;

  const streamer = new Sync.EntityStreamerBuilder(tenants.name)
    .source(AccessControl.userPermissionPolicy("tenants:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(TenantsSync));
