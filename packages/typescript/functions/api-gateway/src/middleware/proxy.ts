import { createMiddleware } from "hono/factory";
import { proxy as honoProxy } from "hono/proxy";

import { lambda } from "../lib/aws";

import type { BlankInput } from "hono/types";

export const proxy = (origin: URL) =>
  createMiddleware<BlankInput, `/${string}/:path{.+}`, BlankInput>(async function (c) {
    const url = new URL(c.req.param("path"), origin);
    url.search = new URL(c.req.url).search;

    return await honoProxy(await lambda.sign(url, c.req.raw));
  });
