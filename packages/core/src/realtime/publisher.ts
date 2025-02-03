import { HttpRequest } from "@smithy/protocol-http";
import * as R from "remeda";

import { SignatureV4, Util } from "../utils/aws";

import type { StartsWith } from "../utils/types";

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
      body: req.body,
    });
  }
}
