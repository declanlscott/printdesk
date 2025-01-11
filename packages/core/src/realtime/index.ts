import { HttpRequest } from "@smithy/protocol-http";
import * as R from "remeda";
import { Resource } from "sst";

import { Api } from "../tenants/api";
import { SignatureV4, Util } from "../utils/aws";

export namespace Realtime {
  export async function getUrl(forTenant = true) {
    const realtimeDomainName = forTenant
      ? (await Api.getAppsyncEventsDomainNames()).realtime
      : Resource.AppsyncEventApi.dns.realtime;

    return Util.formatUrl(
      new HttpRequest({
        protocol: "wss:",
        hostname: realtimeDomainName,
        path: "/event/realtime",
      }),
    );
  }

  export async function getAuth(forTenant = true, body = "{}") {
    const httpDomainName = forTenant
      ? (await Api.getAppsyncEventsDomainNames()).http
      : Resource.AppsyncEventApi.dns.http;

    const { headers: auth } = await SignatureV4.sign(
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
    );

    return auth;
  }

  export async function publish(
    httpDomainName: string,
    channel: string,
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            events: batch,
          }),
        }),
      );

      await fetch(Util.formatUrl(req), {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
    }
  }
}
