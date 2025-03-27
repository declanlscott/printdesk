import { HttpRequest } from "@smithy/protocol-http";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { Backend } from "../backend";
import { Api } from "../backend/api";
import { ServerErrors } from "../errors";
import { SignatureV4, Util } from "../utils/aws";

import type { StartsWith } from "../utils/types";

export namespace Realtime {
  export async function getDns() {
    const res = await Api.send(
      `/.well-known/appspecific/${Backend.getReverseDns()}.realtime.json`,
    );
    if (!res.ok)
      throw new ServerErrors.InternalServerError("Failed to get realtime DNS", {
        cause: await res.text(),
      });

    return v.parse(
      v.object({
        http: v.string(),
        realtime: v.string(),
      }),
      await res.json(),
    );
  }

  export const getUrl = async (
    realtimeDomainName = Resource.AppsyncEventApi.dns.realtime,
  ) =>
    Util.formatUrl(
      new HttpRequest({
        protocol: "wss:",
        hostname: realtimeDomainName,
        path: "/event/realtime",
      }),
    );

  export const getAuth = async (
    httpDomainName = Resource.AppsyncEventApi.dns.http,
    body = "{}",
  ) =>
    SignatureV4.sign(
      "appsync",
      new HttpRequest({
        method: "POST",
        protocol: "https:",
        hostname: httpDomainName,
        path: "/event",
        headers: {
          accept: "application/json, text/javascript",
          "content-encoding": "amz-1.0",
          "content-type": "application/json; charset=UTF-8",
          host: httpDomainName,
        },
        body,
      }),
    ).then((req) => req.headers);

  export async function publish<TChannel extends string>(
    httpDomainName: string,
    channel: StartsWith<"/", TChannel>,
    events: Array<string>,
  ) {
    for (const batch of R.chunk(events, 5)) {
      const req = await SignatureV4.sign(
        "appsync",
        new HttpRequest({
          method: "POST",
          protocol: "https:",
          hostname: httpDomainName,
          path: "/event",
          headers: { "Content-Type": "application/json", host: httpDomainName },
          body: JSON.stringify({
            channel,
            events: batch,
          }),
        }),
      );

      await fetch(Util.formatUrl(req), {
        method: req.method,
        headers: req.headers,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: req.body,
      });
    }
  }
}
