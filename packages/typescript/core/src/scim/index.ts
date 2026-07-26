import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Scim extends Context.Service<Scim, ServiceShape>()("@printdesk/core/scim/Scim") {}
