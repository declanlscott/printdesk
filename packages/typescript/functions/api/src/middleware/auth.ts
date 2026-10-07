import { ActorLayerMap } from "@printdesk/core/actors";
import { AuthMiddleware } from "@printdesk/core/api/middleware/auth";
import { Oauth } from "@printdesk/core/oauth";
import * as Layer from "effect/Layer";

import { openauthLayer } from "../lib/auth";

export const authMiddlewareLayer = AuthMiddleware.layer.pipe(
  Layer.provide([ActorLayerMap.layer, Oauth.AccessTokenLayerMap.layer, openauthLayer]),
);
