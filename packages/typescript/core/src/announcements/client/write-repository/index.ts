import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class AnnouncementsWriteRepository extends Context.Service<
  AnnouncementsWriteRepository,
  ServiceShape
>()("@printdesk/core/announcements/client/WriteRepository") {}
