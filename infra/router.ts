import { Constants } from "@printdesk/core/utils/constants";

import { fqdn } from "./dns";
import { isProdStage } from "./misc";

export const routerSecretRotation = new time.Rotating("RouterSecretRotation", {
  rotationMonths: 1,
});

export const routerSecret = new random.RandomPassword("RouterSecret", {
  length: 32,
  special: true,
  keepers: {
    rotation: routerSecretRotation.id,
  },
});

export const webBasicAuth = $output([
  new sst.Secret("WebUsername").value,
  new sst.Secret("WebPassword").value,
]).apply(([username, password]) =>
  Buffer.from(`${username}:${password}`).toString("base64"),
);

export const router = new sst.aws.Router("Router", {
  domain: {
    name: fqdn,
    dns: sst.cloudflare.dns({ proxy: true }),
    ...(isProdStage
      ? {
          aliases: $output([$interpolate`*.${fqdn}`]),
          redirects: $output([$interpolate`www.${fqdn}`]),
        }
      : undefined),
  },
  edge: {
    viewerRequest: {
      injection: $interpolate`
switch (event.request.uri.split("/")[1]) {
  case "api":
  case "auth": {
    event.request.headers["${Constants.HEADER_NAMES.ROUTER_SECRET}"] = {
      value: "${routerSecret.result}",
    };
    break;
  }
  default: {
    ${
      $app.stage !== "production"
        ? $interpolate`
    if (
      !event.request.headers.authorization ||
      event.request.headers.authorization.value !== "Basic ${webBasicAuth}"
    ) {
      return {
        statusCode: 401,
        headers: {
          "www-authenticate": { value: "Basic" },
        },
      };
    }`
        : `
    break;`
    }
  }
}`,
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

export const outputs = {
  router: router.url,
};
