import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CommentsWriteRepository extends Context.Service<
  CommentsWriteRepository,
  ServiceShape
>()("@printdesk/core/comments/client/WriteRepository") {}
