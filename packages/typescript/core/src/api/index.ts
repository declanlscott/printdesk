import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { RealtimeApi } from "../realtime/api";
import { ReplicacheApi } from "../replicache/api";
import { TenantApi } from "../tenants/api";

export class Api extends HttpApi.make("api")
  .add(RealtimeApi.Group)
  .add(ReplicacheApi.Group)
  .add(TenantApi.Group) {}
