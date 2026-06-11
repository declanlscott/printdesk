// oxlint-disable typescript/no-non-null-assertion
import { createMiddleware } from "hono/factory";
import { proxy as honoProxy } from "hono/proxy";

import { lambda } from "../lib/aws";

import type { BlankInput } from "hono/types";

export const proxy = (origin: URL) =>
  createMiddleware<BlankInput, `/${string}/:path{.+}`, BlankInput>(async function (c) {
    const url = new URL(c.req.param("path"), origin);
    url.search = new URL(c.req.url).search;

    const signedRequest = await lambda.sign(new Request(url, { ...c.req.raw, headers: {} }));
    const headers = new Headers(c.req.header());
    headers.set("authorization", signedRequest.headers.get("authorization")!);
    headers.set("x-amz-date", signedRequest.headers.get("x-amz-date")!);

    return honoProxy(signedRequest, { headers });
  });
