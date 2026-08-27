import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { Bootstrap } from "./bootstrap";
import { Config } from "./config";
import { AuthMiddleware } from "./middleware/auth";
import { ErrorMiddleware } from "./middleware/error";
import { Papercut } from "./papercut";
import { Policy } from "./policy";
import { Realtime } from "./realtime";
import { Replicache } from "./replicache";
import { Scim } from "./scim";

export class Api extends HttpApi.make("Api")
  .addHttpApi(Bootstrap.Api)
  .addHttpApi(Config.Api)
  .addHttpApi(Papercut.MfApi)
  .addHttpApi(Policy.Api)
  .addHttpApi(Realtime.Api)
  .addHttpApi(Replicache.Api)
  .middleware(AuthMiddleware)
  .middleware(ErrorMiddleware)
  .addHttpApi(Scim.Api) {}
