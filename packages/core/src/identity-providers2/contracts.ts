import { Schema } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { TablesContract } from "../tables2/contract";
import { Constants } from "../utils/constants";

import type {
  IdentityProvidersSchema,
  IdentityProviderUserGroupsSchema,
} from "./schemas";

export namespace IdentityProvidersContract {
  export const kinds = [Constants.ENTRA_ID, Constants.GOOGLE] as const;
  export type Kind = (typeof kinds)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    kind: Schema.Literal(...kinds),
    externalId: Schema.String,
  }) {}

  export const tableName = "identity_providers";
  export const table =
    TablesContract.makeTable<IdentityProvidersSchema.Table>()(
      tableName,
      DataTransferObject,
      ["create", "read", "delete"],
    );
}

export namespace IdentityProviderUserGroupsContract {
  export class Row extends Schema.Class<Row>("Row")({
    ...ColumnsContract.Tenant.fields,
    externalId: Schema.String,
    identityProviderId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "identity_provider_user_groups";
  export const table =
    TablesContract.makeInternalTable<IdentityProviderUserGroupsSchema.Table>()(
      tableName,
      Row,
    );
}
