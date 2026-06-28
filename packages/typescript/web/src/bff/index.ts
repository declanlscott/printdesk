import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { ErrorMiddleware } from "@printdesk/core/middleware/error";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { Bff } from "./contract";
import { authGroupLayer } from "./groups/auth";
import { spaGroupLayer } from "./groups/spa";

export default {
  fetch: Bff.pipe(
    HttpApiBuilder.layer,
    Layer.provide([authGroupLayer, HttpRouter.layer, HttpServer.layerServices, spaGroupLayer]),
    Layer.provide(ErrorMiddleware.layer),
    Layer.provide(NodeCrypto.layer),
    HttpRouter.toWebHandler,
  ).handler,
};
