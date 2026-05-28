import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Oauth extends Context.Service<Oauth, ServiceShape>()("@printdesk/core/oauth/Oauth") {}
