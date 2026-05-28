import { api, invokeApiFunctionUrl } from "./api";
import { invokeIssuerFunctionUrl, issuer } from "./auth";
import { hostnames } from "./dns";
import * as lib from "./lib";
import { aws_ } from "./utils";

export const rateLimit = new sst.cloudflare.RateLimit("RateLimit", {
  namespaceId: 1001,
  limit: 100,
  period: "1 minute",
});

export const reverseProxyAwsPermissions = new sst.Linkable("ReverseProxyAwsPermissions", {
  properties: {},
  include: [invokeApiFunctionUrl, invokeIssuerFunctionUrl],
});

export const reverseProxy = new lib.cloudflare.Worker("ReverseProxy", {
  handler: "packages/typescript/functions/reverse-proxy/src/index.ts",
  domains: {
    api: hostnames.properties.api,
    auth: hostnames.properties.auth,
  },
  placement: { region: `aws:${aws_.properties.region}` },
  link: [aws_, api, hostnames, issuer, rateLimit, reverseProxyAwsPermissions],
});
