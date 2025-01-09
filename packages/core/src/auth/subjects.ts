import { createSubjects } from "@openauthjs/openauth/subject";
import * as v from "valibot";

import { nanoIdSchema } from "../utils/shared";

export const userSubjectSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
});

export const subjects = createSubjects({
  user: userSubjectSchema,
});
