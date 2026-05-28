import * as Redacted from "effect/Redacted";
import { createMiddleware } from "hono/factory";
import { proxy } from "hono/proxy";

import { resource } from "../lib/sst";

const url =
  resource.PROTOCOL.pipe(Redacted.value) +
  "://" +
  resource.HOSTNAME.pipe(Redacted.value) +
  ":" +
  resource.PORT.pipe(Redacted.value) +
  "/rpc/api/xmlrpc";

export const papercutApi = createMiddleware(async (c) =>
  proxy(url, { raw: c.req.raw, customFetch: resource.PAPERCUT_API.pipe(Redacted.value).fetch }),
);
