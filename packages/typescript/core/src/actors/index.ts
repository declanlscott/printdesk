import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";

import { ActorsContract } from "./contract";

// @effect-leakable-service
export class Actor extends Context.Service<Actor, ActorsContract.Actor>()(
  "@printdesk/core/actors/Actor",
) {
  public static readonly layer = (actor: typeof Actor.Service) =>
    Layer.succeed(this, this.of(actor)).pipe(Layer.fresh);
}

export class ActorLayerMap extends LayerMap.Service<ActorLayerMap>()(
  "@printdesk/core/actors/ActorLayerMap",
  {
    preloadKeys: [ActorsContract.PublicActor.singleton.wrap],
    lookup: Actor.layer,
  },
) {}
