import { LambdaHandler } from "@effect-aws/lambda";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { Api } from "@printdesk/core/api";
import { ErrorMiddleware } from "@printdesk/core/api/middleware/error";
import * as Layer from "effect/Layer";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { configGroupsLayer } from "./groups/config";
import { papercutMfGroupsLayer } from "./groups/papercut";
import { realtimeGroupLayer } from "./groups/realtime";
import { replicacheGroupLayer } from "./groups/replicache";
import { scimGroupsLayer } from "./groups/scim";

export default Api.pipe(
  HttpApiBuilder.layer,
  Layer.provide([
    HttpServer.layerServices,
    configGroupsLayer,
    papercutMfGroupsLayer,
    realtimeGroupLayer,
    replicacheGroupLayer,
    scimGroupsLayer,
  ]),
  Layer.provide(ErrorMiddleware.layer),
  Layer.provide(NodeCrypto.layer),
  LambdaHandler.fromHttpApi,
);
