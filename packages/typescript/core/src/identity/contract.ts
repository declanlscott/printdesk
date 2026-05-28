import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

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
    Schema.decodeTo(
      AccessToken,
      SchemaTransformation.transform({
        decode: (entraIdAccessToken) => ({
          audience: entraIdAccessToken.aud,
          tenantId: entraIdAccessToken.tid,
        }),
        encode: (accessToken) => ({
          aud: accessToken.audience,
          tid: accessToken.tenantId,
        }),
      }),
    ),
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
    Schema.decodeTo(
      User,
      SchemaTransformation.transform({
        decode: (entraIdUser) => ({
          id: entraIdUser.id,
          username: entraIdUser.userPrincipalName,
          name: entraIdUser.preferredName,
          email: entraIdUser.mail,
        }),
        encode: (user) => ({
          id: user.id,
          userPrincipalName: user.username,
          preferredName: user.name,
          mail: user.email,
        }),
      }),
    ),
  );
  export type EntraIdUser = typeof EntraIdUser.Type;

  export const kinds = [Constants.ENTRA_ID, Constants.GOOGLE] as const;
  export type Kind = (typeof kinds)[number];

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
