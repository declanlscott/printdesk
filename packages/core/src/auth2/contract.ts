import { Schema } from "effect";

import { ColumnsContract } from "../columns2/contract";

export namespace AuthContract {
  export class UserSubjectProperties extends Schema.Class<UserSubjectProperties>(
    "UserSubjectProperties",
  )({
    id: ColumnsContract.EntityId,
    tenantId: ColumnsContract.TenantId,
  }) {}

  export class Session extends Schema.Class<Session>("Session")({
    userId: ColumnsContract.EntityId,
    tenantId: ColumnsContract.TenantId,
  }) {}
}
