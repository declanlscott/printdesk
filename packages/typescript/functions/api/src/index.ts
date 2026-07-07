import { LambdaHandler } from "@effect-aws/lambda";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { Api } from "@printdesk/core/api";
import { errorMiddleware } from "@printdesk/core/middleware/error";
import * as Layer from "effect/Layer";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { papercutMfConfigGroupLayer } from "./groups/config";
import { papercutMfGroupLayer, papercutMfSyncGroupLayer } from "./groups/papercut";
import { realtimeGroupLayer } from "./groups/realtime";
import { replicacheGroupLayer } from "./groups/replicache";

export default Api.pipe(
  HttpApiBuilder.layer,
  Layer.provide([
    HttpServer.layerServices,
    papercutMfConfigGroupLayer,
    papercutMfGroupLayer,
    papercutMfSyncGroupLayer,
    realtimeGroupLayer,
    replicacheGroupLayer,
  ]),
  Layer.provide(errorMiddleware.layer),
  Layer.provide(NodeCrypto.layer),
  LambdaHandler.fromHttpApi,
);
