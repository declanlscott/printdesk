import { auth } from "./auth";
import * as custom from "./custom";
import { dsqlCluster } from "./db";
import { apiFqdn, fqdn } from "./dns";
import { appData, aws_, cloudfrontPrivateKey } from "./misc";
import { tenantInfraQueue } from "./queues";

export const apiFunction = new custom.aws.Function("ApiFunction", {
  handler: "packages/functions/node/src/api/index.handler",
  url: {
    cors: {
      allowOrigins: [$interpolate`https://${fqdn}`, "http://localhost:5173"],
    },
  },
  link: [appData, auth, cloudfrontPrivateKey, dsqlCluster, tenantInfraQueue],
  permissions: [
    {
      actions: ["execute-api:Invoke"],
      resources: [
        $interpolate`arn:aws:execute-api:${aws_.properties.region}:*:${appData.properties.stage}/*`,
      ],
    },
    {
      actions: ["sts:AssumeRole"],
      resources: [
        aws_.properties.tenant.realtimeSubscriberRole.name,
        aws_.properties.tenant.realtimePublisherRole.name,
        aws_.properties.tenant.bucketsAccessRole.name,
        aws_.properties.tenant.putParametersRole.name,
      ].map((roleName) => $interpolate`arn:aws:iam::*:role/${roleName}`),
    },
  ],
});

export const api = new sst.aws.Router("Api", {
  routes: {
    "/*": apiFunction.url,
  },
});

export const apiReverseProxy = new sst.cloudflare.Worker("ApiReverseProxy", {
  handler: "packages/workers/src/api-reverse-proxy.ts",
  domain: apiFqdn,
  link: [api, auth],
  // NOTE: In the future when cloudflare terraform provider v5 is released and pulumi/sst supports it,
  // we can remove this and declare the rate limiter workers with their bindings and link them here.
  transform: {
    worker: {
      serviceBindings: [
        {
          name: "USER_RATE_LIMITER",
          service: "printworks-user-rate-limiter",
        },
        {
          name: "IP_RATE_LIMITER",
          service: "printworks-ip-rate-limiter",
        },
      ],
    },
  },
});

export const outputs = {
  api: apiReverseProxy.url,
};
