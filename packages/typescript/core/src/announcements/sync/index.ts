import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class AnnouncementsSync extends Context.Service<AnnouncementsSync, ServiceShape>()(
  "@printdesk/core/announcements/Sync",
) {}
