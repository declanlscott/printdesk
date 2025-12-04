import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns/contract";
import { TablesContract } from "../tables/contract";
import { Constants } from "../utils/constants";

import type { IdentityProvidersSchema } from "./schema";

export namespace IdentityProvidersContract {
  export class AccessToken extends Schema.Class<AccessToken>("AccessToken")({
    audience: Schema.String,
    tenantId: Schema.String,
  }) {}

  export const EntraIdAccessToken = Schema.Struct({
    aud: Schema.String,
    tid: Schema.String,
  }).pipe(
    Schema.transform(AccessToken, {
      strict: true,
      decode: (entraIdAccessToken) => ({
        audience: entraIdAccessToken.aud,
        tenantId: entraIdAccessToken.tid,
      }),
      encode: (accessToken) => ({
        aud: accessToken.audience,
        tid: accessToken.tenantId,
      }),
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
    Schema.transform(User, {
      strict: true,
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
  );
  export type EntraIdUser = typeof EntraIdUser.Type;

  export const kinds = [Constants.ENTRA_ID, Constants.GOOGLE] as const;
  export type Kind = (typeof kinds)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    kind: Schema.Literal(...kinds),
    externalTenantId: Schema.String,
  }) {}

  export const tableName = "identity_providers";
  export const table =
    new (TablesContract.makeClass<IdentityProvidersSchema.Table>())(
      tableName,
      DataTransferObject,
      ["create", "read", "delete"],
    );
}
