import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerAccessRepository extends Context.Service<
  SharedAccountCustomerAccessRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/CustomerAccessRepository") {}
