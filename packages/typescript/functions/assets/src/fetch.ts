import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { Assets } from "./contract";
import { imagesGroupLayer } from "./groups/images";

export const fetch = Assets.pipe(
  HttpApiBuilder.layer,
  Layer.provide([imagesGroupLayer, HttpRouter.layer, HttpServer.layerServices]),
  Layer.tapCause(Effect.logError),
  HttpRouter.toWebHandler,
).handler;
