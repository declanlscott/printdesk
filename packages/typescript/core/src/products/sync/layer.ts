import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ProductsSync } from ".";
import { AccessControl } from "../../access-control";
import { Sync } from "../../sync";
import { ProductsRepository } from "../repository";
import { products } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* ProductsRepository;

  const streamer = new Sync.EntityStreamerBuilder(products.name)
    .source(AccessControl.userPermissionPolicy("products:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_products:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_published_products:read"), {
      findCreates: repository.findActivePublishedCreates,
      findUpdates: repository.findActivePublishedUpdates,
      findDeletes: repository.findActivePublishedDeletes,
      fastForward: repository.findActivePublishedFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(ProductsSync));
