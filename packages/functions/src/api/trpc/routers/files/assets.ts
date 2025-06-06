import { t } from "~/api/trpc";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const assetsRouter = t.router({
  // TODO
});

export type AssetsRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof assetsRouter
>;
