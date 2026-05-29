import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as SqlError from "effect/unstable/sql/SqlError";

export class DataConflictError extends Schema.TaggedErrorClass<DataConflictError>()(
  "DataConflictError",
  Struct.omit(SqlError.UnknownError.fields, ["_tag"]),
) {
  public static readonly code = "OC000";

  // oxlint-disable-next-line class-methods-use-this
  public get isRetryable() {
    return true;
  }
}

export class SchemaConflictError extends Schema.TaggedErrorClass<SchemaConflictError>()(
  "SchemaConflictError",
  Struct.omit(SqlError.UnknownError.fields, ["_tag"]),
) {
  public static readonly code = "OC001";

  // oxlint-disable-next-line class-methods-use-this
  public get isRetryable() {
    return true;
  }
}

export const DsqlErrorReason = Schema.Union([DataConflictError, SchemaConflictError]);

export class DsqlError extends Schema.TaggedErrorClass<DsqlError>()("DsqlError", {
  reason: DsqlErrorReason,
}) {
  public override readonly cause = this.reason;

  public override get message() {
    return this.reason.message || this.reason._tag;
  }

  public get isRetryable() {
    return this.reason.isRetryable;
  }
}
