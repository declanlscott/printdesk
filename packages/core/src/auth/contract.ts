import * as Data from "effect/Data";
import * as Schema from "effect/Schema";

import { ActorsContract } from "../actors/contract";
import { separatedString } from "../utils";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ColumnsContract } from "../columns/contract";

export namespace AuthContract {
  export class UserSubject extends Schema.TaggedClass<UserSubject>(
    "UserSubject",
  )("UserSubject", ActorsContract.UserActor.fields) {}

  export const subjects: {
    [UserSubject._tag]: StandardSchemaV1<
      typeof UserSubject.Encoded,
      typeof UserSubject.Type
    > &
      Schema.SchemaClass<
        typeof UserSubject.Type,
        typeof UserSubject.Encoded,
        never
      >;
  } = { [UserSubject._tag]: Schema.standardSchemaV1(UserSubject) };

  export class InvalidAudienceError extends Data.TaggedError(
    "InvalidAudienceError",
  )<{
    readonly expected: string;
    readonly received: string;
  }> {}

  export class TenantSuspendedError extends Data.TaggedError(
    "TenantSuspendedError",
  )<{ readonly tenantId: ColumnsContract.TenantId }> {}

  export const Token = separatedString();
}
