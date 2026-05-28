import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CustomerGroupsRepository extends Context.Service<
  CustomerGroupsRepository,
  ServiceShape
>()("@printdesk/core/groups/CustomersRepository") {}
