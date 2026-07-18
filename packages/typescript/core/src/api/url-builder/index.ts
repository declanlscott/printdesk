import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ApiUrlBuilder extends Context.Service<ApiUrlBuilder, ServiceShape>()(
  "@printdesk/core/api/UrlBuilder",
) {}
