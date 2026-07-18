import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class CommentsReadRepository extends Context.Service<
  CommentsReadRepository,
  ReadRepository
>()("@printdesk/core/comments/client/ReadRepository") {}

export class CommentsWriteRepository extends Context.Service<
  CommentsWriteRepository,
  WriteRepository
>()("@printdesk/core/comments/client/WriteRepository") {}
