import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerAccessReadRepository extends Context.Service<
  SharedAccountCustomerAccessReadRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/CustomerAccessReadRepository") {}
