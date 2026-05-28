import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerAccessSync extends Context.Service<
  SharedAccountCustomerAccessSync,
  ServiceShape
>()("@printdesk/core/shared-accounts/CustomerAccessSync") {}
