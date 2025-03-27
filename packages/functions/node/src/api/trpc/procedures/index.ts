import { t } from "~/api/trpc";
import { errorHandler } from "~/api/trpc/middleware/error";

export const procedure = t.procedure.use(errorHandler);
