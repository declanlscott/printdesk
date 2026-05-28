import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerGroupAccessWriteRepository extends Context.Service<
  SharedAccountCustomerGroupAccessWriteRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/CustomerGroupAccessWriteRepository") {}
