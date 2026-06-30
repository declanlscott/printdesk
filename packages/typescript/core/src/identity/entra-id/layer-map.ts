import * as Duration from "effect/Duration";
import * as LayerMap from "effect/LayerMap";

import { layer } from "./layer";

export class EntraIdLayerMap extends LayerMap.Service<EntraIdLayerMap>()(
  "@printdesk/core/identity/EntraIdLayerMap",
  {
    idleTimeToLive: Duration.minutes(15),
    lookup: layer,
  },
) {}
