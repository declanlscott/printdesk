import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class AnnouncementsPolicies extends Context.Service<AnnouncementsPolicies, ServiceShape>()(
  "@printdesk/core/announcements/client/Policies",
) {}
