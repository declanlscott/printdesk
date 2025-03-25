import { t } from "~/api/trpc";
import { assetsRouter } from "~/api/trpc/routers/files/assets";
import { documentsRouter } from "~/api/trpc/routers/files/documents";

export const filesRouter = t.router({
  assets: assetsRouter,
  documents: documentsRouter,
});
