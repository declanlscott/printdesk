import * as Context from "effect/Context";

import type { ProvidersRepository } from "./layer";

export class IdentityProvidersRepository extends Context.Service<
  IdentityProvidersRepository,
  ProvidersRepository
>()("@printdesk/core/identity/ProvidersRepository") {}
