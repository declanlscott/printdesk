import { Constants } from "@printdesk/core/utils/constants";
import * as Boolean from "effect/Boolean";
import * as HashSet from "effect/HashSet";
import * as Record from "effect/Record";
import { createMiddleware } from "hono/factory";
import { proxy as honoProxy } from "hono/proxy";

import { lambda } from "../lib/aws";

import type { BlankInput } from "hono/types";

/**
 * @see https://github.com/mhart/aws4fetch/issues/77
 */
const headerRemovalFilterSet = HashSet.make(
  Constants.FORWARDED_AUTHORIZATION_HEADER_NAME,
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "x-forwarded-for",
  "x-real-ip",
);

export const proxy = (origin: URL) =>
  createMiddleware<BlankInput, `/${string}/:path{.+}`, BlankInput>(async function (c) {
    const url = new URL(c.req.param("path"), origin);
    url.search = new URL(c.req.url).search;

    const headers = new Headers(
      Record.filter(c.req.header(), (_, name) =>
        headerRemovalFilterSet.pipe(HashSet.has(name.toLowerCase()), Boolean.not),
      ),
    );
    const authorization = c.req.header("Authorization");
    if (authorization) headers.set(Constants.FORWARDED_AUTHORIZATION_HEADER_NAME, authorization);

    return await honoProxy(url, {
      customFetch: (req) => lambda.fetch(req, { redirect: "manual" }),
      headers,
      raw: c.req.raw,
    });
  });
