import { LambdaHandler } from "@effect-aws/lambda";
import { Api } from "@printdesk/core/api";
import * as Layer from "effect/Layer";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { realtimeGroupLayer } from "./groups/realtime";
import { replicacheGroupLayer } from "./groups/replicache";
import { tenantGroupLayer } from "./groups/tenant";

export const handler = Api.pipe(
  HttpApiBuilder.layer,
  Layer.provide([
    realtimeGroupLayer,
    replicacheGroupLayer,
    tenantGroupLayer,
    HttpServer.layerServices,
  ]),
  LambdaHandler.fromHttpApi,
);
