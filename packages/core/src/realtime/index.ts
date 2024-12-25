import { HttpRequest } from "@smithy/protocol-http";
import * as R from "remeda";

import { Api } from "../api";
import { SignatureV4, Util } from "../utils/aws";

export namespace Realtime {
  export const getUrl = async () =>
    Util.formatUrl(
      new HttpRequest({
        protocol: "wss:",
        hostname: await Api.getAppsyncRealtimeDomainName(),
        path: "/event/realtime",
      }),
    );

  export async function getAuthProtocol() {
    // TODO: Implement
  }

  export async function publish(channel: string, events: Array<string>) {
    const hostname = await Api.getAppsyncHttpDomainName();

    for (const batch of R.chunk(events, 5)) {
      const req = await SignatureV4.sign(
        "appsync",
        new HttpRequest({
          method: "POST",
          protocol: "https:",
          hostname,
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
