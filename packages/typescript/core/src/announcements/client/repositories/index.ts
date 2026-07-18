import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class AnnouncementsReadRepository extends Context.Service<
  AnnouncementsReadRepository,
  ReadRepository
>()("@printdesk/core/announcements/client/ReadRepository") {}

export class AnnouncementsWriteRepository extends Context.Service<
  AnnouncementsWriteRepository,
  WriteRepository
>()("@printdesk/core/announcements/client/WriteRepository") {}
