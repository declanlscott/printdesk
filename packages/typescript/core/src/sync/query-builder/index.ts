import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SyncQueryBuilder extends Context.Service<SyncQueryBuilder, ServiceShape>()(
  "@printdesk/core/sync/QueryBuilder",
) {}
