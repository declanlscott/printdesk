import { router } from "./cdn";
import { isProdStage } from "./misc";

export const www = new sst.aws.Astro("Www", {
  path: "packages/www",
  buildCommand: "pnpm build",
  router: {
    instance: router,
    path: isProdStage ? "/" : "/www",
  },
});

export const outputs = {
  www: www.url,
};
