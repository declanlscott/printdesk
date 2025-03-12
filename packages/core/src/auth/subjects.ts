import { createSubjects } from "@openauthjs/openauth/subject";

import { Constants } from "../utils/constants";
import { userSubjectPropertiesSchema } from "./shared";

import type { SubjectPayload } from "@openauthjs/openauth/subject";

export const subjects = createSubjects({
  [Constants.SUBJECT_KINDS.USER]: userSubjectPropertiesSchema,
});

export type Subject = SubjectPayload<typeof subjects>;

export type UserSubject = Extract<
  SubjectPayload<typeof subjects>,
  { type: typeof Constants.SUBJECT_KINDS.USER }
>;
