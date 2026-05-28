import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class AnnouncementsRepository extends Context.Service<
  AnnouncementsRepository,
  ServiceShape
>()("@printdesk/core/announcements/Repository") {}
