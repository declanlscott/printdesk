import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class AnnouncementsRepository extends Context.Service<AnnouncementsRepository, Repository>()(
  "@printdesk/core/announcements/Repository",
) {}

export class AnnouncementsSyncRepository extends Context.Service<
  AnnouncementsSyncRepository,
  SyncRepository
>()("@printdesk/core/announcements/SyncRepository") {}
