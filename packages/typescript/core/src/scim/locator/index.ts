import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ScimLocator extends Context.Service<ScimLocator, ServiceShape>()(
  "@printdesk/core/scim/Locator",
) {}
