import { OauthContract } from "@printdesk/core/oauth/contract";
import * as Redacted from "effect/Redacted";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { resource } from "./lib/sst";
import { subject } from "./middleware/auth";
import { proxy } from "./middleware/proxy";
import { ratelimit } from "./middleware/ratelimit";

declare module "hono" {
  interface ContextVariableMap {
    subject?: (typeof OauthContract.subjects)[keyof typeof OauthContract.subjects]["Type"];
  }
}

const hostnames = resource.Hostnames.pipe(Redacted.value);
const originUrls = {
  api: new URL(resource.Api.pipe(Redacted.value).url),
  auth: new URL(resource.Issuer.pipe(Redacted.value).url),
};

export default new Hono({ getPath: (req) => req.url.replace(/^https?:\/([^?]+).*$/, "$1") })
  .use(logger())
  .use(subject)
  .use(ratelimit)
  .all(`/${hostnames.api}/:path{.+}`, proxy(originUrls.api))
  .all(`/${hostnames.auth}/:path{.+}`, proxy(originUrls.auth))
  .onError((e, c) => {
    if ("getResponse" in e) return e.getResponse();

    return c.newResponse(e.message, 500);
  });
