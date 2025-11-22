import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns2/contract";
import { TablesContract } from "../tables2/contract";

import type { GroupsSchema } from "./schema";

export namespace GroupsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    name: Schema.String,
    externalId: Schema.String,
    identityProviderId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "groups";
  export const table = TablesContract.makeTable<GroupsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TablesContract.makeView<GroupsSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );
}
