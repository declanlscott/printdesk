import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Struct from "effect/Struct";

import { TablesContract } from "../tables/contract";
import { Constants } from "../utils/constants";

import type { IdentityProvidersTable } from "./sql";

export namespace IdentityProvidersContract {
  export class AccessToken extends Schema.Class<AccessToken>("AccessToken")({
    audience: Schema.String,
    tenantId: Schema.String,
  }) {}

  export const EntraIdAccessToken = Schema.Struct({
    aud: Schema.String,
    tid: Schema.String,
  }).pipe(
    Schema.decodeTo(AccessToken, {
      decode: SchemaGetter.transform(Struct.renameKeys({ aud: "audience", tid: "tenantId" })),
      encode: SchemaGetter.transform(Struct.renameKeys({ audience: "aud", tenantId: "tid" })),
    }),
  );

  export class User extends Schema.Class<User>("User")({
    id: Schema.String,
    username: Schema.String,
    name: Schema.String,
    email: Schema.String,
  }) {}

  export const EntraIdUser = Schema.Struct({
    id: Schema.String,
    userPrincipalName: Schema.String,
    preferredName: Schema.String,
    mail: Schema.String,
  }).pipe(
    Schema.decodeTo(User, {
      decode: SchemaGetter.transform(
        Struct.renameKeys({
          userPrincipalName: "username",
          preferredName: "name",
          mail: "email",
        }),
      ),
      encode: SchemaGetter.transform(
        Struct.renameKeys({
          username: "userPrincipalName",
          name: "preferredName",
          email: "mail",
        }),
      ),
    }),
  );
  export type EntraIdUser = typeof EntraIdUser.Type;

  export const kinds = [Constants.ENTRA_ID, Constants.GOOGLE] as const;
  export const Kind = Schema.Literals(kinds);
  export type Kind = typeof Kind.Type;

  export class Table extends TablesContract.Table<IdentityProvidersTable>("identity_providers")(
    {
      ...TablesContract.BaseModel.fields,
      kind: Schema.Literals(kinds),
      externalTenantId: Schema.String,
    },
    ["create", "read", "delete"],
    [],
  ) {}
}
