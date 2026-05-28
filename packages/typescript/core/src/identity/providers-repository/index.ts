import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class IdentityProvidersRepository extends Context.Service<
  IdentityProvidersRepository,
  ServiceShape
>()("@printdesk/core/identity/ProvidersRepository") {}
