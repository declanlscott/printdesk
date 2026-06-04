import * as Context from "effect/Context";
import * as Schema from "effect/Schema";

import type { ServiceShape } from "./layer";

export class EntraIdError extends Schema.TaggedErrorClass<EntraIdError>()("EntraIdError", {
  cause: Schema.Defect(),
}) {}

export class EntraId extends Context.Service<EntraId, ServiceShape>()(
  "@printdesk/core/identity/EntraId",
) {}
