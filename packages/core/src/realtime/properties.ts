import { HttpRequest } from "@smithy/protocol-http";
import { Resource } from "sst";

import { Api } from "../backend/api";
import { SignatureV4, Util } from "../utils/aws";

export async function getRealtimeUrl(forTenant = true) {
  const realtimeDomainName = forTenant
    ? (await Api.getRealtimeDns()).realtime
    : Resource.AppsyncEventApi.dns.realtime;

  return Util.formatUrl(
    new HttpRequest({
      protocol: "wss:",
      hostname: realtimeDomainName,
      path: "/event/realtime",
    }),
  );
}

export async function getRealtimeAuth(forTenant = true, body = "{}") {
  const httpDomainName = forTenant
    ? (await Api.getRealtimeDns()).http
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
