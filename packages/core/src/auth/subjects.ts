import { createSubjects } from "@openauthjs/openauth/subject";
import * as v from "valibot";

import { nanoIdSchema } from "../utils/shared";

import type { SubjectPayload } from "@openauthjs/openauth/subject";

export const userSubjectPropertiesSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
});

export const subjects = createSubjects({
  user: userSubjectPropertiesSchema,
});

export type Subject = SubjectPayload<typeof subjects>;

export type UserSubject = Extract<
  SubjectPayload<typeof subjects>,
  { type: "user" }
>;
