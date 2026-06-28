import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Struct from "effect/Struct";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { CustomerGroupsContract } from "../groups/contracts";
import { TablesContract } from "../tables/contract";
import { UsersContract } from "../users/contract";
import { Constants } from "../utils/constants";

import type { IdentityProvidersTable } from "./sql";

export namespace IdentityProvidersContract {
  export const Kind = Schema.Literals([Constants.ENTRA_ID, Constants.GOOGLE]);
  export type Kind = typeof Kind.Type;

  export const Audience = Schema.NonEmptyString.pipe(Schema.brand("IdentityProviderAudience"));
  export type Audience = typeof Audience.Type;

  export const ExternalTenantId = Schema.NonEmptyString.pipe(
    Schema.brand("IdentityProviderExternalTenantId"),
  );
  export type ExternalTenantId = typeof ExternalTenantId.Type;

  export class AccessToken extends Schema.Class<AccessToken>("AccessToken")({
    audience: Audience,
    tenantId: ExternalTenantId,
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
    displayName: UsersContract.DisplayName,
    email: UsersContract.Email,
    externalId: UsersContract.ExternalId,
    username: UsersContract.Username,
  }) {}

  export const EntraIdUser = Schema.Struct({
    id: Schema.String,
    mail: Schema.String,
    preferredName: Schema.String,
    userPrincipalName: Schema.String,
  }).pipe(
    Schema.decodeTo(User, {
      decode: SchemaGetter.transform(
        Struct.renameKeys({
          id: "externalId",
          mail: "email",
          preferredName: "displayName",
          userPrincipalName: "username",
        }),
      ),
      encode: SchemaGetter.transform(
        Struct.renameKeys({
          displayName: "preferredName",
          email: "mail",
          externalId: "id",
          username: "userPrincipalName",
        }),
      ),
    }),
  );
  export type EntraIdUser = typeof EntraIdUser.Type;

  export class Group extends Schema.Class<Group>("Group")({
    externalId: CustomerGroupsContract.ExternalId,
    name: CustomerGroupsContract.Name,
  }) {}

  export const EntraIdGroup = Schema.Struct({
    displayName: Schema.String,
    id: Schema.String,
  }).pipe(
    Schema.decodeTo(Group, {
      decode: SchemaGetter.transform(Struct.renameKeys({ displayName: "name", id: "externalId" })),
      encode: SchemaGetter.transform(Struct.renameKeys({ externalId: "id", name: "displayName" })),
    }),
  );
  export type EntraIdGroup = typeof EntraIdGroup.Type;

  export class Table extends TablesContract.Table<IdentityProvidersTable>("identity_providers")(
    {
      ...TablesContract.BaseModel.fields,
      kind: Kind,
      externalTenantId: ExternalTenantId,
    },
    ["create", "read", "delete"],
    [],
  ) {}

  export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
    "IdentityProviderNotFoundError",
    Table.Dto.mapFields(Struct.pick(["kind", "externalTenantId"])),
  ) {}

  export class NotImplementedError
    extends Schema.TaggedErrorClass<NotImplementedError>()(
      "IdentityProviderNotImplementedError",
      { kind: Kind },
      { httpApiStatus: 501 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(NotImplementedError)(this, { status: 501 });
  }
}
