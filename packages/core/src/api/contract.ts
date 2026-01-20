import * as HttpApi from "@effect/platform/HttpApi";

import { RealtimeApi } from "../realtime/api";
import { ReplicacheApi } from "../replicache/api";

export namespace ApiContract {
  export class Application extends HttpApi.make("application")
    .add(RealtimeApi.Group)
    .add(ReplicacheApi.Group) {}
}
