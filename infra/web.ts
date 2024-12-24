import { auth } from "./auth";
import { dsqlCluster } from "./db";
import { appFqdn } from "./dns";
import { appData, aws_, client } from "./misc";
import { tenantInfraQueue } from "./queues";

export const reverseProxy = new sst.cloudflare.Worker("ReverseProxy", {
  handler: "packages/workers/src/reverse-proxy.ts",
  domain: appFqdn,
  // NOTE: In the future when cloudflare terraform provider v5 is released and pulumi/sst supports it,
  // we can remove this and declare the rate limiter workers with their bindings and link them here.
  transform: {
    worker: {
      serviceBindings: [
        {
          name: "SESSION_RATE_LIMITER",
          service: "printworks-session-rate-limiter",
        },
        {
          name: "IP_RATE_LIMITER",
          service: "printworks-ip-rate-limiter",
        },
      ],
    },
  },
});

export const webUsername = new sst.Secret("WebUsername");
export const webPassword = new sst.Secret("WebPassword");

const basicAuth = $output([webUsername.value, webPassword.value]).apply(
  ([username, password]) =>
    Buffer.from(`${username}:${password}`).toString("base64"),
);

sst.Linkable.wrap(sst.aws.Astro, (astro) => ({
  properties: {
    url: astro.url,
    server: {
      role: {
        principal: astro.nodes.server?.nodes.role.arn ?? "*",
      },
    },
  },
}));

export const web = new sst.aws.Astro("Web", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [appData, auth, client, dsqlCluster, tenantInfraQueue],
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
  domain: {
    name: appFqdn,
    dns: sst.cloudflare.dns(),
  },
  server: {
    edge:
      $app.stage !== "production"
        ? {
            viewerRequest: {
              injection: $interpolate`
if (
  !event.request.headers.authorization ||
  event.request.headers.authorization.value !== "Basic ${basicAuth}"
) {
  return {
    statusCode: 401,
    headers: {
      "www-authenticate": { value: "Basic" }
    }
  };
}`,
            },
          }
        : undefined,
    architecture: "arm64",
    runtime: "nodejs22.x",
    install: ["sharp"],
  },
});

export const outputs = {
  url: reverseProxy.url,
};
