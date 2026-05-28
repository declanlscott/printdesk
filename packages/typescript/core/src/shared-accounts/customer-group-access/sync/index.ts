import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerGroupAccessSync extends Context.Service<
  SharedAccountCustomerGroupAccessSync,
  ServiceShape
>()("@printdesk/core/shared-accounts/CustomerGroupAccessSync") {}
