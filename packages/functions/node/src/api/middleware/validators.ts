import { vValidator } from "@hono/valibot-validator";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import * as v from "valibot";

export const authzHeadersValidator = vValidator(
  "header",
  v.looseObject({ authorization: v.string() }),
);

export const setupHeadersValidator = vValidator(
  "header",
  v.object({
    authorization: v.string(),
    "x-tenant-id": nanoIdSchema,
  }),
);
