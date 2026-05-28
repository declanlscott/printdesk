import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CustomerGroupMembershipsSync extends Context.Service<
  CustomerGroupMembershipsSync,
  ServiceShape
>()("@printdesk/core/groups/CustomerMembershipsSync") {}
