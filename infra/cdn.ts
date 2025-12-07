import { Constants } from "@printdesk/core/utils/constants";

import { domains, tenantDomains } from "./dns";
import * as lib from "./lib/components";
import { isProdStage } from "./misc";

export const routerSecretRotation = new lib.time.Rotating(
  "RouterSecretRotation",
  { rotationMonths: 1 },
);

export const routerSecret = new random.RandomPassword("RouterSecret", {
  length: 32,
  special: true,
  keepers: { rotation: routerSecretRotation.id },
});

export const webBasicAuth = $output([
  new sst.Secret("WebUsername").value,
  new sst.Secret("WebPassword").value,
]).apply(([username, password]) =>
  Buffer.from(`${username}:${password}`).toString("base64"),
);

export const router = new sst.aws.Router("Router", {
  domain: {
    name: domains.properties.web,
    dns: sst.cloudflare.dns({ proxy: true }),
    aliases: $output(
      isProdStage
        ? [$interpolate`*.${domains.properties.web}`]
        : [domains.properties.api, domains.properties.auth],
    ),
    redirects: isProdStage ? $output([domains.properties.www]) : undefined,
  },
  edge: {
    viewerRequest: {
      injection: $resolve([
        domains.properties,
        routerSecret.result,
        webBasicAuth,
      ] as const).apply(([domains, routerSecret, webBasicAuth]) =>
        [
          `switch (event.request.headers.host.value) {`,
          `  case "${domains.api}":`,
          `  case "${domains.auth}": {`,
          `    event.request.headers["${Constants.HEADER_KEYS.ROUTER_SECRET}"] = {`,
          `      value: "${routerSecret}",`,
          `    };`,
          `    break;`,
          `  }`,
          `  default: {`,
          ...(!isProdStage
            ? [
                `    if (`,
                `      !event.request.headers.authorization ||`,
                `      event.request.headers.authorization.value !== "Basic ${webBasicAuth}"`,
                `    ) {`,
                `      return {`,
                `        statusCode: 401,`,
                `        headers: {`,
                `          "www-authenticate": { value: "Basic" },`,
                `        },`,
                `      };`,
                `    }`,
              ]
            : [`    break;`]),
          `  }`,
          `}`,
        ].join("\n"),
      ),
    },
  },
  transform: {
    cdn: {
      transform: {
        distribution: {
          priceClass: "PriceClass_100",
        },
      },
    },
  },
});

export const cloudfrontPrivateKey = new tls.PrivateKey("CloudfrontPrivateKey", {
  algorithm: "RSA",
  rsaBits: 2048,
});

export const cloudfrontPublicKey = new aws.cloudfront.PublicKey(
  "CloudfrontPublicKey",
  { encodedKey: cloudfrontPrivateKey.publicKeyPem },
);

export const cloudfrontKeyGroup = new aws.cloudfront.KeyGroup(
  "CloudfrontKeyGroup",
  { items: [cloudfrontPublicKey.id] },
);

export const cloudfrontApiCachePolicy = new aws.cloudfront.CachePolicy(
  "CloudfrontApiCachePolicy",
  {
    defaultTtl: 0,
    minTtl: 0,
    maxTtl: 31536000, // 1 year
    parametersInCacheKeyAndForwardedToOrigin: {
      cookiesConfig: {
        cookieBehavior: "none",
      },
      headersConfig: {
        headerBehavior: "none",
      },
      queryStringsConfig: {
        queryStringBehavior: "none",
      },
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    },
  },
);

export const cloudfrontS3OriginAccessControl =
  new aws.cloudfront.OriginAccessControl("CloudfrontS3OriginAccessControl", {
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
  });

export const tenantRouterPatterns = new sst.Linkable("TenantRouterPatterns", {
  properties: {
    api: {
      template: $interpolate`${tenantDomains.properties.cdn.nameTemplate}/api`,
    },
    storage: {
      template: $interpolate`${tenantDomains.properties.cdn.nameTemplate}/storage`,
    },
  },
});
