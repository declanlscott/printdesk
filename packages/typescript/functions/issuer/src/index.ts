import { LambdaHandler } from "@effect-aws/lambda";

import { issuerHandler } from "./handler";
import { layer } from "./handler/layer";

export const handler = LambdaHandler.make({ layer, handler: issuerHandler });
