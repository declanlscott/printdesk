import { LambdaHandler } from "@effect-aws/lambda";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { Api } from "@printdesk/core/api";
import { ErrorMiddleware } from "@printdesk/core/middleware/error";
import * as Layer from "effect/Layer";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { realtimeGroupLayer } from "./groups/realtime";
import { replicacheGroupLayer } from "./groups/replicache";
import { tenantRegistrationGroupLayer, tenantSetupGroupLayer } from "./groups/tenant";

export const handler = Api.pipe(
  HttpApiBuilder.layer,
  Layer.provide([
    HttpServer.layerServices,
    realtimeGroupLayer,
    replicacheGroupLayer,
    tenantRegistrationGroupLayer,
    tenantSetupGroupLayer,
  ]),
  Layer.provide(ErrorMiddleware.layer),
  Layer.provide(NodeCrypto.layer),
  LambdaHandler.fromHttpApi,
);
