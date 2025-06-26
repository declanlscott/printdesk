import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";

import { Constants } from "../utils/constants";

import type { LambdaBindings } from "./shared";

export namespace Middleware {
  export const sourceValidator = (source: string) =>
    createMiddleware<{ Bindings: LambdaBindings }>(async (c, next) => {
      if (
        c.env.event.headers["x-forwarded-host"] !== source ||
        c.env.event.headers[Constants.HEADER_KEYS.ROUTER_SECRET] !==
          Resource.RouterSecret.value
      )
        throw new HTTPException(403);

      await next();
    });
}
