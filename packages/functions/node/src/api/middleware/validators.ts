import { vValidator } from "@hono/valibot-validator";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import * as v from "valibot";

export const authzHeaderValidator = vValidator(
  "header",
  v.looseObject({ authorization: v.string() }),
);

export const registrationHeaderValidator = vValidator(
  "header",
  v.object({
    authorization: v.string(),
    "x-tenant-id": nanoIdSchema,
  }),
);
