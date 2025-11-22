import * as Data from "effect/Data";
import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns2/contract";
import { Constants } from "../utils/constants";

import type { StandardSchemaV1 } from "@standard-schema/spec";

export namespace AuthContract {
  export class Session extends Schema.Class<Session>("Session")({
    userId: ColumnsContract.EntityId,
    tenantId: ColumnsContract.TenantId,
  }) {}

  export class UserSubject extends Schema.Class<UserSubject>("UserSubject")({
    id: ColumnsContract.EntityId,
    tenantId: ColumnsContract.TenantId,
  }) {}

  export const subjects: {
    [Constants.SUBJECT_KINDS.USER]: StandardSchemaV1<
      typeof UserSubject.Encoded,
      typeof UserSubject.Type
    > &
      Schema.SchemaClass<
        typeof UserSubject.Type,
        typeof UserSubject.Encoded,
        never
      >;
  } = {
    [Constants.SUBJECT_KINDS.USER]: Schema.standardSchemaV1(UserSubject),
  };

  export class InvalidAudienceError extends Data.TaggedError(
    "InvalidAudienceError",
  )<{
    readonly expected: string;
    readonly received: string;
  }> {}

  export class TenantSuspendedError extends Data.TaggedError(
    "TenantSuspendedError",
  )<{
    readonly tenantId: ColumnsContract.TenantId;
  }> {}
}
