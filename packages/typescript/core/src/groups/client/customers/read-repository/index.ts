import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CustomerGroupsReadRepository extends Context.Service<
  CustomerGroupsReadRepository,
  ServiceShape
>()("@printdesk/core/groups/client/CustomersReadRepository") {}
