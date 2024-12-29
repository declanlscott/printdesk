import { vValidator } from "@hono/valibot-validator";
import * as v from "valibot";

export const authzValidator = vValidator(
  "header",
  v.looseObject({ authorization: v.string() }),
);
