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
      injection: $interpolate`event.request.headers["${Constants.HEADER_NAMES.ROUTER_SECRET}"] = { value: "${routerSecret.result}" };`,
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
