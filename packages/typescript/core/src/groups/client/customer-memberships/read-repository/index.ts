import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CustomerGroupMembershipsReadRepository extends Context.Service<
  CustomerGroupMembershipsReadRepository,
  ServiceShape
>()("@printdesk/core/groups/client/CustomerMembershipsReadRepository") {}
