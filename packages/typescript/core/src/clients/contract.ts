import * as Schema from "effect/Schema";

import { CryptoContract } from "../crypto/contract";
import { TablesContract } from "../tables/contract";

import type { ClientsTable } from "./sql";

export namespace ClientsContract {
  export const roles = ["api", "invoicesProcessor", "papercutSync", "setup"] as const;

  export const Role = Schema.Literals(roles);
  export type Role = (typeof Role)["Type"];

  export class Table extends TablesContract.Table<ClientsTable>("clients")(
    {
      ...TablesContract.BaseModel.fields,
      name: Schema.NonEmptyString,
      secretHash: CryptoContract.HashFromString,
      role: Role,
      scopes: Schema.NonEmptyString.pipe(Schema.Array),
    },
    ["read", "delete"],
  ) {}
}
