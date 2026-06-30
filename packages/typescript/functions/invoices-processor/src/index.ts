import { LambdaHandler } from "@effect-aws/lambda";

import { handler } from "./handler";
import { layer } from "./handler/layer";

export default LambdaHandler.make({ layer, handler });
