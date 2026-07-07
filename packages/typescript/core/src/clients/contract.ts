import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { CryptoContract } from "../crypto/contract";
import { TablesContract } from "../tables/contract";
import { CallbackId } from "../utils";

import type { ClientsTable } from "./sql";

export namespace ClientsContract {
  export const roles = ["api", "invoicesProcessor", "papercutMfSync", "setup"] as const;

  export const Role = Schema.Literals(roles);
  export type Role = (typeof Role)["Type"];

  export class Table extends TablesContract.Table<ClientsTable>("clients")(
    {
      ...TablesContract.BaseModel.fields,
      name: Schema.NonEmptyString,
      secretHash: CryptoContract.HashFromString,
      role: Role,
      scopes: Schema.NonEmptyString.pipe(Schema.Array),
      callbackId: CallbackId.pipe(
        Schema.NullOr,
        Schema.withDecodingDefaultType(Effect.succeed(null)),
        Schema.withConstructorDefault(Effect.succeed(null)),
      ),
    },
    ["create", "read", "delete"],
  ) {}

  export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
    "ClientNotFoundError",
    { id: Table.Model.fields.id },
  ) {}
}
