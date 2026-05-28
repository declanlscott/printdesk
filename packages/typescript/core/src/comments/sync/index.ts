import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CommentsSync extends Context.Service<CommentsSync, ServiceShape>()(
  "@printdesk/core/comments/Sync",
) {}
