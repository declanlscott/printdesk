import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class AnnouncementsReadRepository extends Context.Service<
  AnnouncementsReadRepository,
  ServiceShape
>()("@printdesk/core/announcements/client/ReadRepository") {}
