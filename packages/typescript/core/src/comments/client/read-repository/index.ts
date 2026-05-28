import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CommentsReadRepository extends Context.Service<CommentsReadRepository, ServiceShape>()(
  "@printdesk/core/comments/client/ReadRepository",
) {}
