import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CommentsPolicies extends Context.Service<CommentsPolicies, ServiceShape>()(
  "@printdesk/core/comments/client/Policies",
) {}
