import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class CommentsRepository extends Context.Service<CommentsRepository, Repository>()(
  "@printdesk/core/comments/Repository",
) {}

export class CommentsSyncRepository extends Context.Service<
  CommentsSyncRepository,
  SyncRepository
>()("@printdesk/core/comments/Repository") {}
