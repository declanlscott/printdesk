import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerGroupAccessRepository extends Context.Service<
  SharedAccountCustomerGroupAccessRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/CustomerGroupAccessRepository") {}
