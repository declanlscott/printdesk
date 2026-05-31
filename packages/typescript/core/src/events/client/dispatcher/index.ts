import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class EventsDispatcher extends Context.Service<EventsDispatcher, ServiceShape>()(
  "@printdesk/core/events/client/Dispatcher",
) {}
