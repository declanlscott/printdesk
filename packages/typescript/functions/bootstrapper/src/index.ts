import { withDurableExecution } from "@aws/durable-execution-sdk-js";

import { handler } from "./handler";

export default withDurableExecution(handler);
