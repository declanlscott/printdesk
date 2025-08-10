import { Schema } from "effect";

import { NanoId } from "../utils2/shared";

export namespace AuthContract {
  export const UserSubjectProperties = Schema.Struct({
    id: NanoId,
    tenantId: NanoId,
  });

  export class Session extends Schema.Class<Session>("Session")(
    UserSubjectProperties.fields,
  ) {}
}
