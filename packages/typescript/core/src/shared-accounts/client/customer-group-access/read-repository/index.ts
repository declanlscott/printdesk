import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerGroupAccessReadRepository extends Context.Service<
  SharedAccountCustomerGroupAccessReadRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/CustomerGroupAccessReadRepository") {}
