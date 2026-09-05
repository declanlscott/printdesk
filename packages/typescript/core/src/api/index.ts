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
  .addHttpApi(Bootstrap.Api.prefix("/bootstrap"))
  .addHttpApi(Config.Api.prefix("/config"))
  .addHttpApi(Papercut.MfApi.prefix("/papercut/mf"))
  .addHttpApi(Policy.Api.prefix("/policy"))
  .addHttpApi(Realtime.Api.prefix("/realtime"))
  .addHttpApi(Replicache.Api.prefix("/replicache"))
  .middleware(AuthMiddleware)
  .middleware(ErrorMiddleware)
  .addHttpApi(Scim.Api.prefix("/scim")) {}
