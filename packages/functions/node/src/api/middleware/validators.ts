import { vValidator } from "@hono/valibot-validator";
import { Constants } from "@printworks/core/utils/constants";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import * as v from "valibot";

export const userAuthzHeadersValidator = vValidator(
  "header",
  v.looseObject({ authorization: v.string() }),
);

export const systemAuthzHeadersValidator = vValidator(
  "header",
  v.object({
    authorization: v.string(),
    [Constants.HEADER_NAMES.TENANT_ID]: nanoIdSchema,
  }),
);
