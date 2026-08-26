import { decodeBase32IgnorePadding, encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import * as Struct from "effect/Struct";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { ColumnsContract } from "../columns/contract";
import { Handler } from "../handlers";
import { TablesContract } from "../tables/contract";
import { EntityId, TenantId, UnpaddedBase32 } from "../utils";
import { Constants } from "../utils/constants";

import type { TenantsTable } from "./sql";

export namespace TenantsContract {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  export const IdFromUnpaddedBase32String = UnpaddedBase32.pipe(
    Schema.decodeTo(TenantId, {
      decode: SchemaGetter.transformOrFail((base32, options) =>
        Effect.try({
          try: () => decodeBase32IgnorePadding(base32),
          catch: (error) =>
            new Encoding.EncodingError({
              input: base32,
              kind: "Decode",
              module: "TenantsContract",
              message:
                error instanceof globalThis.Error
                  ? error.message
                  : "Unknown error decoding tenant id",
            }),
        }).pipe(
          Effect.flatMap((bytes) =>
            Effect.try({
              try: () => textDecoder.decode(bytes),
              catch: (error) =>
                new Encoding.EncodingError({
                  input: bytes,
                  kind: "Decode",
                  module: "TenantsContract",
                  message:
                    error instanceof globalThis.Error
                      ? error.message
                      : "Unknown error decoding tenant id",
                }),
            }),
          ),
          Effect.mapError(
            (e) => new SchemaIssue.InvalidValue({ message: e.message }, base32, options),
          ),
        ),
      ),
      encode: SchemaGetter.transform((tenantId) =>
        encodeBase32LowerCaseNoPadding(textEncoder.encode(tenantId)),
      ),
    }),
  );

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
      licenseId: EntityId,
    },
    ["read", "update", "delete"],
    ["lastPapercutSyncAt", "licenseId", "version"],
  ) {}

  export class TenantSlugConflictError
    extends Schema.TaggedError<TenantSlugConflictError>()(
      "TenantSlugConflictError",
      { slug: Slug },
      { httpApiStatus: 409 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(TenantSlugConflictError)(this, { status: 409 });
  }

  export class InvalidStatusError extends Schema.TaggedError<InvalidStatusError>()(
    "InvalidTenantStatusError",
    Table.Model.mapFields(Struct.pick(["id", "status"])),
  ) {}

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
