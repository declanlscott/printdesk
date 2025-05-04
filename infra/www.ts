import { fqdn } from "./dns";
import { isDevMode, isProdStage } from "./misc";
import { router } from "./router";

export const www = new sst.aws.Astro("Www", {
  path: "packages/www",
  buildCommand: "pnpm build",
});
if (isProdStage) router.route("/", www.url);
else
  router.route("/www", www.url, {
    rewrite: {
      regex: "^/www/(.*)$",
      to: "/$1",
    },
  });

export const outputs = {
  www: isDevMode
    ? "http://url-unavailable-in-dev.mode"
    : $interpolate`https://${fqdn}${isProdStage ? "" : "/www"}`,
};
