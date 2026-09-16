import { AuthMiddleware } from "@printdesk/core/api/middleware/auth";
import { ErrorMiddleware } from "@printdesk/core/api/middleware/error";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { Images } from "./images";

export class Assets extends HttpApi.make("Assets")
  .addHttpApi(Images.Api)
  .middleware(AuthMiddleware)
  .middleware(ErrorMiddleware) {}
