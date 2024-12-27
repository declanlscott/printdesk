import { HttpRequest } from "@smithy/protocol-http";
import * as R from "remeda";

import { Api } from "../api";
import { SignatureV4, Util } from "../utils/aws";

export namespace Realtime {
  export async function getUrl() {
    const { realtime: realtimeDomainName } =
      await Api.getAppsyncEventsDomainNames();

    return Util.formatUrl(
      new HttpRequest({
        protocol: "wss:",
        hostname: realtimeDomainName,
        path: "/event/realtime",
      }),
    );
  }

  export async function getAuth(body?: unknown) {
    const { http: httpDomainName } = await Api.getAppsyncEventsDomainNames();

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: req.body,
      });
    }
  }
}
