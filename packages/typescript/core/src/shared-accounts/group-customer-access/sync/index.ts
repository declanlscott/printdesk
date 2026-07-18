import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountGroupCustomerAccessSync extends Context.Service<
  SharedAccountGroupCustomerAccessSync,
  ServiceShape
>()("@printdesk/core/shared-accounts/GroupCustomerAccessSync") {}
