import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CustomerGroupMembershipsRepository extends Context.Service<
  CustomerGroupMembershipsRepository,
  ServiceShape
>()("@printdesk/core/groups/CustomerMembershipsRepository") {}
