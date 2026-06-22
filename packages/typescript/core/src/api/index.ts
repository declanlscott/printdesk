import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { RealtimeApi } from "./realtime";
import { ReplicacheApi } from "./replicache";
import { TenantApi } from "./tenant";

export class Api extends HttpApi.make("Api")
  .add(RealtimeApi.Group)
  .add(ReplicacheApi.Group)
  .add(TenantApi.RegistrationGroup)
  .add(TenantApi.SetupGroup) {}
