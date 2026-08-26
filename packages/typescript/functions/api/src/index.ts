import { LambdaHandler } from "@effect-aws/lambda";
import { Api } from "@printdesk/core/api";
import * as Layer from "effect/Layer";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { bootstrapGroupLayer } from "./groups/bootstrap";
import { configGroupsLayer } from "./groups/config";
import { papercutMfGroupsLayer } from "./groups/papercut";
import { realtimeGroupLayer } from "./groups/realtime";
import { replicacheGroupLayer } from "./groups/replicache";
import { scimGroupsLayer } from "./groups/scim";

export default Api.pipe(
  HttpApiBuilder.layer,
  Layer.provide([
    HttpServer.layerServices,
    bootstrapGroupLayer,
    configGroupsLayer,
    papercutMfGroupsLayer,
    realtimeGroupLayer,
    replicacheGroupLayer,
    scimGroupsLayer,
  ]),
  LambdaHandler.fromHttpApi,
);
