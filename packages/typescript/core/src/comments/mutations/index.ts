import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CommentsMutations extends Context.Service<CommentsMutations, ServiceShape>()(
  "@printdesk/core/comments/Mutations",
) {}
