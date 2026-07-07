import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { ConfigApi } from "./config";
import { PapercutApi } from "./papercut";
import { RealtimeApi } from "./realtime";
import { ReplicacheApi } from "./replicache";

export class Api extends HttpApi.make("Api")
  .add(ConfigApi.PapercutMfGroup)
  .add(PapercutApi.MfGroup)
  .add(PapercutApi.MfSyncGroup)
  .add(RealtimeApi.Group)
  .add(ReplicacheApi.Group) {}
