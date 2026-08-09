import * as Schema from "effect/Schema";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { ColumnsContract } from "../columns/contract";
import { TablesContract } from "../tables/contract";

import type { LicensesTable } from "./sql";

export namespace LicensesContract {
  export const Key = Schema.String.pipe(Schema.check(Schema.isUUID()), Schema.Redacted);

  export class Table extends TablesContract.Table<LicensesTable>("licenses")(
    {
      key: Key,
      expiresAt: ColumnsContract.NullableTimestamp,
      ...ColumnsContract.Timestamps.fields,
    },
    ["read"],
    [],
  ) {}

  export class NoSuchLicenseError
    extends Schema.TaggedError<NoSuchLicenseError>()(
      "NoSuchLicenseError",
      { key: Key },
      { httpApiStatus: 422 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(NoSuchLicenseError)(this, { status: 422 });
  }

  export class LicenseKeyConflictError
    extends Schema.TaggedError<LicenseKeyConflictError>()(
      "LicenseKeyConflictError",
      { key: Key },
      { httpApiStatus: 409 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(LicenseKeyConflictError)(this, { status: 409 });
  }

  export class ExpiredLicenseError
    extends Schema.TaggedError<ExpiredLicenseError>()(
      "ExpiredLicenseError",
      { expiredAt: Schema.DateTimeUtc },
      { httpApiStatus: 403 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(ExpiredLicenseError)(this, { status: 403 });
  }
}
