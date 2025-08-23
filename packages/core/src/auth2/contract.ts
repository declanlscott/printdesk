import { Schema } from "effect";

import { TableContract } from "../database2/contract";

export namespace AuthContract {
  export class UserSubjectProperties extends Schema.Class<UserSubjectProperties>(
    "UserSubjectProperties",
  )({
    id: TableContract.EntityId,
    tenantId: TableContract.TenantId,
  }) {}

  export class Session extends Schema.Class<Session>("Session")({
    userId: TableContract.EntityId,
    tenantId: TableContract.TenantId,
  }) {}
}
