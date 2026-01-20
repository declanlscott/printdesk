import { LambdaHandler } from "@effect-aws/lambda";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { ApiContract } from "@printdesk/core/api/contract";
import * as Layer from "effect/Layer";

import { realtimeLayer } from "./groups/realtime";
import { replicacheLayer } from "./groups/replicache";

export const handler = HttpApiBuilder.api(ApiContract.Application).pipe(
  Layer.provide(realtimeLayer),
  Layer.provide(replicacheLayer),
  Layer.merge(NodeHttpServer.layerContext),
  LambdaHandler.fromHttpApi,
);
