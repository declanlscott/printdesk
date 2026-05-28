import { LambdaHandler } from "@effect-aws/lambda";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const handler = LambdaHandler.make({
  layer: Layer.empty,
  handler: () => Effect.succeed({}),
});
