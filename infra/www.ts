import { fqdn } from "./dns";

export const www = new sst.aws.Astro("Www", {
  path: "packages/www",
  buildCommand: "pnpm build",
  domain: {
    name: fqdn,
    dns: sst.cloudflare.dns(),
  },
});

export const outputs = {
  www: www.url,
};
