import { t } from "~/api/trpc";
import { assetsRouter } from "~/api/trpc/routers/files/assets";
import { documentsRouter } from "~/api/trpc/routers/files/documents";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const filesRouter = t.router({
  assets: assetsRouter,
  documents: documentsRouter,
});

export type FilesRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof filesRouter
>;
