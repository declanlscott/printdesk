import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { HandlersContract } from "../handlers/contract";
import { TablesContract } from "../tables/contract";

import type { LicensesTable } from "./sql";

export namespace LicensesContract {
  export const statuses = ["active", "expired"] as const;
  export type Status = (typeof statuses)[number];

  export const Key = Schema.String.pipe(Schema.check(Schema.isUUID()), Schema.Redacted);

  export class Table extends TablesContract.Table<LicensesTable>("licenses")(
    {
      ...TablesContract.BaseModel.fields,
      key: Key,
      status: Schema.Literals(statuses).pipe(
        Schema.withDecodingDefaultType(Effect.succeed("active")),
      ),
    },
    ["read"],
    ["key"],
  ) {}

  export const isAvailable = new HandlersContract.Handler({
    name: "isLicenseAvailable",
    Input: Table.Model.mapFields(Struct.pick(["key"])),
    Output: Schema.Void,
  });
}
