import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { Handler } from "../handlers";
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

  export const isAvailable = new Handler.Handler({
    name: "isLicenseAvailable",
    Input: Table.Model.mapFields(Struct.pick(["key"])),
    Output: Schema.Void,
  });
}
