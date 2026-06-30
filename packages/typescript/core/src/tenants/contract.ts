import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { CloudflareContract } from "../cloudflare/contract";
import { ColumnsContract } from "../columns/contract";
import { Handler } from "../handlers";
import { IdentityProvidersContract } from "../identity/contract";
import { LicensesContract } from "../licenses/contract";
import { PapercutContract } from "../papercut/contract";
import { TablesContract } from "../tables/contract";
import { EntityId } from "../utils";
import { Constants } from "../utils/constants";

import type { TenantsTable } from "./sql";

export namespace TenantsContract {
  export const Status = Schema.Literals(["setup", "active", "suspended"]);
  export type Status = typeof Status.Type;

  export const Slug = Schema.String.pipe(
    Schema.check(Schema.isPattern(Constants.TENANT_SLUG_REGEX)),
    Schema.brand("TenantSlug"),
  );
  export type Slug = typeof Slug.Type;

  export class Table extends TablesContract.Table<TenantsTable>("tenants")(
    {
      ...TablesContract.BaseSyncModel.fields,
      slug: Slug,
      name: Schema.String,
      status: Status.pipe(Schema.withDecodingDefaultType(Effect.succeed("setup"))),
      lastPapercutSyncAt: ColumnsContract.NullableTimestamp,
      licenseKey: LicensesContract.Key,
    },
    ["read", "update", "delete"],
    ["lastPapercutSyncAt", "licenseKey", "version"],
  ) {}

  export class TenantSlugConflictError
    extends Schema.TaggedErrorClass<TenantSlugConflictError>()(
      "TenantSlugConflictError",
      { slug: Slug },
      { httpApiStatus: 409 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(TenantSlugConflictError)(this, { status: 409 });
  }

  export class InactiveTenantError
    extends Schema.TaggedErrorClass<InactiveTenantError>()(
      "InactiveTenantError",
      { status: Status },
      { httpApiStatus: 403 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(InactiveTenantError)(this, { status: 403 });
  }

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

  export class RegistrationPayload extends Schema.Class<RegistrationPayload>("RegistrationPayload")(
    {
      tenant: Table.Model.mapFields(Struct.pick(["name", "slug", "licenseKey"])),
      identityProviders: IdentityProvidersContract.Table.Model.mapFields(
        Struct.pick(["kind", "externalTenantId"]),
      ).pipe(
        Schema.NonEmptyArray,
        Schema.check(
          Schema.makeFilter((providers) =>
            Array.length(Array.dedupeWith(providers, (a, b) => a.kind === b.kind)) !==
            Array.length(providers)
              ? ["Identity provider kind must be unique"]
              : [],
          ),
        ),
      ),
      papercutConfig: PapercutContract.EnabledConfig.mapFields(Struct.omit(["enabled"])).pipe(
        Schema.OptionFromOptional,
      ),
    },
  ) {}

  export class RegistrationSuccess extends Schema.Class<RegistrationSuccess>("RegistrationSuccess")(
    { deploymentId: EntityId },
    { httpApiStatus: 200 },
  ) {}

  export class SetupPayload extends Schema.Class<SetupPayload>("SetupPayload")({
    deploymentId: EntityId,
    papercutApiAuthToken: PapercutContract.ApiAuthToken.pipe(Schema.OptionFromOptional),
  }) {}

  export class UnexpectedPapercutApiAuthTokenPayloadError
    extends Schema.TaggedErrorClass<UnexpectedPapercutApiAuthTokenPayloadError>()(
      "UnexpectedPapercutApiAuthTokenPayloadError",
      {},
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(UnexpectedPapercutApiAuthTokenPayloadError)(this, {
        status: 400,
      });
  }

  export class SetupSuccess extends Schema.Class<SetupSuccess>("SetupSuccess")({
    papercutApiTunnelToken: CloudflareContract.TunnelToken.pipe(Schema.OptionFromNullOr),
  }) {}
}
