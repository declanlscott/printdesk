import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Crypto extends Context.Service<Crypto, ServiceShape>()(
  "@printdesk/core/crypto/Crypto",
) {}
