import { fqdn } from "./dns";
import { isProdStage } from "./misc";

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
