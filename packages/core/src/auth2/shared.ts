import { Schema } from "effect";

import { NanoId } from "../utils2/shared";

export const UserSubjectProperties = Schema.Struct({
  id: NanoId,
  tenantId: NanoId,
});
export type UserSubjectProperties = Schema.Schema.Type<
  typeof UserSubjectProperties
>;
