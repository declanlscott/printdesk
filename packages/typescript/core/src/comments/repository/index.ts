import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CommentsRepository extends Context.Service<CommentsRepository, ServiceShape>()(
  "@printdesk/core/comments/Repository",
) {}
