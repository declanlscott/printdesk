import { ConfidentialClientApplication } from "@azure/msal-node";
import { Oauth2Provider } from "@openauthjs/openauth/provider/oauth2";
import { and, eq, getTableColumns } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Database } from "../database";
import { Sst } from "../sst";
import { TenantsSchema } from "../tenants/schemas";
import { UsersSchema } from "../users/schema";
import { Constants } from "../utils/constants";
import { IdentityProvidersSchema } from "./schema";

import type { Oauth2WrappedConfig } from "@openauthjs/openauth/provider/oauth2";
import type { InferInsertModel } from "drizzle-orm";
import type { IdentityProvidersContract } from "./contract";

export namespace EntraId {
  export interface OauthProviderConfig extends Oauth2WrappedConfig {
    tenant: string;
  }

  export const oauthProvider = ({ tenant, ...config }: OauthProviderConfig) =>
    Oauth2Provider({
      ...config,
      type: Constants.ENTRA_ID,
      endpoint: {
        authorization: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      },
    });

  export class ClientError extends Data.TaggedError("EntraIdClientError")<{
    readonly cause: unknown;
  }> {}

  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/identity/EntraIdClient",
    {
      accessors: true,
      dependencies: [Sst.Resource.layer],
      effect: (
        externalTenantId: IdentityProvidersContract.DataTransferObject["externalTenantId"],
      ) =>
        Effect.gen(function* () {
          const { clientId, clientSecret } =
            yield* Sst.Resource.IdentityProviders.pipe(
              Effect.map(Redacted.value),
              Effect.map(Struct.get(Constants.ENTRA_ID)),
            );

          const client = new ConfidentialClientApplication({
            auth: {
              clientId,
              clientSecret,
              authority: `https://login.microsoftonline.com/${externalTenantId}`,
            },
          });

          const accessToken = Effect.tryPromise({
            try: () =>
              client.acquireTokenByClientCredential({
                scopes: ["https://graph.microsoft.com/.default"],
              }),
            catch: (cause) => new ClientError({ cause }),
          }).pipe(
            Effect.flatMap((result) =>
              result === null
                ? Effect.fail(
                    new ClientError({
                      cause: new globalThis.Error(
                        "Missing authentication result",
                      ),
                    }),
                  )
                : Effect.succeed(result.accessToken),
            ),
          );

          return { accessToken } as const;
        }),
    },
  ) {}
}

export namespace Google {
  // TODO
}

export namespace IdentityProviders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/identity/ProvidersRepository",
    {
      accessors: true,
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = IdentityProvidersSchema.table.definition;

        const upsert = Effect.fn("IdentityProviders.Repository.upsert")(
          (identityProvider: InferInsertModel<IdentityProvidersSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(identityProvider)
                  .onConflictDoUpdate({
                    target: [table.id, table.tenantId],
                    set: IdentityProvidersSchema.table.conflictSet,
                  })
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findAll = Effect.fn("IdentityProviders.Repository.findAll")(
          (tenantId: IdentityProvidersSchema.Row["tenantId"]) =>
            db.useTransaction((tx) =>
              tx.select().from(table).where(eq(table.tenantId, tenantId)),
            ),
        );

        const findById = Effect.fn("IdentityProviders.Repository.findById")(
          (
            id: IdentityProvidersSchema.Row["id"],
            tenantId: IdentityProvidersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findBySubdomain = Effect.fn(
          "IdentityProviders.Repository.findBySubdomain",
        )((subdomain: TenantsSchema.Row["subdomain"]) =>
          db.useTransaction((tx) =>
            tx
              .select(getTableColumns(table))
              .from(TenantsSchema.table.definition)
              .innerJoin(
                table,
                eq(TenantsSchema.table.definition.id, table.tenantId),
              )
              .where(eq(TenantsSchema.table.definition.subdomain, subdomain)),
          ),
        );

        const findWithTenantAndUserByExternalIds = Effect.fn(
          "IdentityProviders.Repository.findWithTenantAndUserByExternalIds",
        )(
          (
            kind: IdentityProvidersSchema.Row["kind"],
            externalTenantId: IdentityProvidersSchema.Row["externalTenantId"],
            externalUserId: UsersSchema.Row["externalId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    identityProvider: getTableColumns(table),
                    tenant: getTableColumns(TenantsSchema.table.definition),
                    user: getTableColumns(UsersSchema.table.definition),
                  })
                  .from(table)
                  .innerJoin(
                    TenantsSchema.table.definition,
                    eq(table.tenantId, TenantsSchema.table.definition.id),
                  )
                  .leftJoin(
                    UsersSchema.table.definition,
                    and(
                      eq(
                        table.id,
                        UsersSchema.table.definition.identityProviderId,
                      ),
                      eq(table.tenantId, UsersSchema.table.definition.tenantId),
                      eq(
                        UsersSchema.table.definition.externalId,
                        externalUserId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(table.kind, kind),
                      eq(table.externalTenantId, externalTenantId),
                    ),
                  ),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          upsert,
          findAll,
          findById,
          findBySubdomain,
          findWithTenantAndUserByExternalIds,
        } as const;
      }),
    },
  ) {}
}
