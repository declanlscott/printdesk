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

export const apiGatewayAwsPermissions = new sst.Linkable("ApiGatewayAwsPermissions", {
  properties: {},
  include: [invokeApiFunctionUrl, invokeIssuerFunctionUrl],
});

export const apiGateway = new lib.cloudflare.Worker("ApiGateway", {
  handler: "packages/typescript/functions/api-gateway/src/index.ts",
  domains: {
    api: hostnames.properties.api,
    auth: hostnames.properties.auth,
  },
  placement: { region: `aws:${aws_.properties.region}` },
  link: [aws_, api, hostnames, issuer, rateLimit, apiGatewayAwsPermissions],
});
