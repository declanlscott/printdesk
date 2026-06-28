import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { ConfigApi } from "./config";
import { RealtimeApi } from "./realtime";
import { ReplicacheApi } from "./replicache";
import { TenantApi } from "./tenant";

export class Api extends HttpApi.make("Api")
  .add(ConfigApi.PapercutGroup)
  .add(RealtimeApi.Group)
  .add(ReplicacheApi.Group)
  .add(TenantApi.RegistrationGroup)
  .add(TenantApi.SetupGroup) {}
