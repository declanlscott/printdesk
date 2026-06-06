import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { Handler } from "../handlers";
import { TablesContract } from "../tables/contract";
import { Constants } from "../utils/constants";

import type { TenantsTable } from "./sql";

export namespace TenantsContract {
  export const statuses = ["setup", "active", "suspended"] as const;
  export type Status = (typeof statuses)[number];

  export const Slug = Schema.String.pipe(
    Schema.check(Schema.isPattern(Constants.TENANT_SLUG_REGEX)),
    Schema.brand("Slug"),
  );
  export type Slug = typeof Slug.Type;

  export class Table extends TablesContract.Table<TenantsTable>("tenants")(
    {
      ...TablesContract.BaseSyncModel.fields,
      slug: Slug,
      name: Schema.String,
      status: Schema.Literals(statuses).pipe(
        Schema.withDecodingDefaultType(Effect.succeed("setup")),
      ),
      lastPapercutSyncAt: ColumnsContract.NullableTimestamp,
    },
    ["read", "update"],
    ["version", "lastPapercutSyncAt"],
  ) {}

  export const isSlugAvailable = new Handler.Handler({
    name: "isTenantSlugAvailable",
    Input: Table.Model.mapFields(Struct.pick(["slug"])),
    Output: Schema.Void,
  });

  export const edit = new Handler.Handler({
    name: "editTenant",
    Input: Table.Dto.mapFields(
      Struct.omit([...Struct.keys(TablesContract.BaseModel.fields), "status"]),
    )
      .mapFields(Struct.map(Schema.optional))
      .mapFields(
        Struct.assign(
          Struct.evolve(Struct.pick(Table.Model.fields, ["id", "updatedAt"]), {
            id: (id) => id.from.schema.members[0],
          }),
        ),
      ),
    Output: Table.Dto,
  });
}
