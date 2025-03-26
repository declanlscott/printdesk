import { t } from "~/api/trpc";

export const errorHandler = t.middleware(async (opts) => {
  const result = await opts.next(opts);

  return result;
});
