import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ClientsRepository extends Context.Service<ClientsRepository, ServiceShape>()(
  "@printdesk/core/clients/Repository",
) {}
