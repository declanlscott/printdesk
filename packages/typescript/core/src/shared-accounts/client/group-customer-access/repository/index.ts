import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountGroupCustomerAccessRepository extends Context.Service<
  SharedAccountGroupCustomerAccessRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/GroupCustomerAccessRepository") {}
