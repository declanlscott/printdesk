import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class AnnouncementsMutations extends Context.Service<AnnouncementsMutations, ServiceShape>()(
  "@printdesk/core/announcements/Mutations",
) {}
