import { siteEdgeProtection } from "./auth";
import { fqdn } from "./dns";

export const www = new sst.aws.Astro("Www", {
  path: "packages/www",
  buildCommand: "pnpm build",
  domain: {
    name: $interpolate`www.${fqdn}`,
    dns: sst.cloudflare.dns(),
  },
  server: {
    edge: siteEdgeProtection,
  },
});

export const outputs = {
  www: www.url,
};
