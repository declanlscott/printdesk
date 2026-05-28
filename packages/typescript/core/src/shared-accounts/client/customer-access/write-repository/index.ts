import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountCustomerAccessWriteRepository extends Context.Service<
  SharedAccountCustomerAccessWriteRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/CustomerAccessWriteRepository") {}
