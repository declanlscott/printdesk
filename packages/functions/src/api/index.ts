import { LambdaHandler } from "@effect-aws/lambda";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { ApiContract } from "@printdesk/core/api/contract";
import * as Layer from "effect/Layer";

import { realtimeLayer } from "./realtime";

export const handler = HttpApiBuilder.api(ApiContract.Application).pipe(
  Layer.provide(realtimeLayer),
  Layer.merge(NodeHttpServer.layerContext),
  LambdaHandler.fromHttpApi,
);
