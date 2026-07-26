import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { Config } from "./config";
import { ErrorMiddleware } from "./middleware/error";
import { Papercut } from "./papercut";
import { Realtime } from "./realtime";
import { Replicache } from "./replicache";
import { Scim } from "./scim";

export class Api extends HttpApi.make("Api")
  .addHttpApi(Config.Api)
  .addHttpApi(Papercut.MfApi)
  .addHttpApi(Realtime.Api)
  .addHttpApi(Replicache.Api)
  .middleware(ErrorMiddleware)
  .addHttpApi(Scim.Api) {}
