import { ErrorMiddleware } from "@printdesk/core/api/middleware/error";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { Auth } from "./auth";
import { Spa } from "./spa";

export class Bff extends HttpApi.make("bff")
  .addHttpApi(Auth.Api)
  .addHttpApi(Spa.Api)
  .middleware(ErrorMiddleware) {}
