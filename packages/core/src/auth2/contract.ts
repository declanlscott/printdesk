import { Schema } from "effect";

import { NanoId } from "../utils2";

export namespace AuthContract {
  export class UserSubjectProperties extends Schema.Class<UserSubjectProperties>(
    "UserSubjectProperties",
  )({
    id: NanoId,
    tenantId: NanoId,
  }) {}

  export class Session extends Schema.Class<Session>("Session")({
    userId: NanoId,
    tenantId: NanoId,
  }) {}
}
