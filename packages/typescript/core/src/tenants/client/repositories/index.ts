import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class TenantsReadRepository extends Context.Service<TenantsReadRepository, ReadRepository>()(
  "@printdesk/core/tenants/client/ReadRepository",
) {}

export class TenantsWriteRepository extends Context.Service<
  TenantsWriteRepository,
  WriteRepository
>()("@printdesk/core/tenants/client/WriteRepository") {}
