import { isEqual } from "date-fns";
import { and, eq, getTableName, isNull } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";

import { AccessControl } from "../access-control";
import { oauth2ProvidersTable } from "../auth/sql";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { poke } from "../replicache/poke";
import { Utils } from "../utils";
import { Sqs } from "../utils/aws";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import { useTenant } from "./context";
import { licensesTable, tenantMetadataTable, tenantsTable } from "./sql";

import type { Registration, TenantInfraProgramInput } from "./shared";
import type { License, Tenant } from "./sql";

export namespace Tenants {
  export const read = async () =>
    useTransaction((tx) =>
      tx.select().from(tenantsTable).where(eq(tenantsTable.id, useTenant().id)),
    );

  export const update = fn(updateTenantMutationArgsSchema, async (values) => {
    await AccessControl.enforce([getTableName(tenantsTable), "update"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: getTableName(tenantsTable), id: values.id }],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(tenantsTable)
        .set(values)
        .where(eq(tenantsTable.id, useTenant().id));

      await afterTransaction(() => poke(["/tenant"]));
    });
  });

  export const isSlugAvailable = async (slug: Tenant["slug"]) =>
    ["api", "auth", "backend"].includes(slug) ||
    (await useTransaction((tx) =>
      tx
        .select({})
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, slug))
        .then((rows) => rows.length === 0),
    ));

  export const isLicenseKeyAvailable = async (licenseKey: License["key"]) =>
    useTransaction((tx) =>
      tx
        .select({})
        .from(licensesTable)
        .where(
          and(
            eq(licensesTable.key, licenseKey),
            eq(licensesTable.status, "active"),
            isNull(licensesTable.tenantId),
          ),
        )
        .then((rows) => rows.length === 1),
    );


  export const register = async (
    registration: Omit<
      Registration,
      | "tailscaleOauthClientId"
      | "tailscaleOauthClientSecret"
      | "tailnetPapercutServerUri"
      | "papercutServerAuthToken"
    >,
  ) =>
    useTransaction(async (tx) => {
      const tenant = await tx
        .insert(tenantsTable)
        .values({
          id:
            registration.tenantSlug === "demo"
              ? Constants.DEMO_TENANT_ID
              : undefined,
          slug: registration.tenantSlug,
          name: registration.tenantName,
        })
        .onConflictDoUpdate({
          target: tenantsTable.id,
          set: buildConflictUpdateColumns(tenantsTable, ["slug", "name"]),
          setWhere: eq(tenantsTable.status, "initializing"),
        })
        .returning({
          id: tenantsTable.id,
          createdAt: tenantsTable.createdAt,
          updatedAt: tenantsTable.updatedAt,
        })
        .then(R.first());
      if (!tenant) throw new Error("Failed to create tenant");

      // Assign tenant to license if the tenant was just created
      if (isEqual(tenant.createdAt, tenant.updatedAt)) {
        const license = await tx
          .update(licensesTable)
          .set({ tenantId: tenant.id })
          .where(
            and(
              eq(licensesTable.key, registration.licenseKey),
              isNull(licensesTable.tenantId),
            ),
          )
          .returning()
          .then(R.first());
        if (!license) throw new Error("Failed to assign tenant to license");
      }

      await tx
        .insert(oauth2ProvidersTable)
        .values({
          id: registration.userOauthProviderId,
          type: registration.userOauthProviderType,
          tenantId: tenant.id,
        })
        .onConflictDoUpdate({
          target: [oauth2ProvidersTable.id, oauth2ProvidersTable.tenantId],
          set: buildConflictUpdateColumns(oauth2ProvidersTable, ["type"]),
        });

      const infraProgramInput = {
        papercutSyncSchedule: registration.papercutSyncSchedule,
        timezone: registration.timezone,
      } satisfies TenantInfraProgramInput;

      await tx
        .insert(tenantMetadataTable)
        .values({ tenantId: tenant.id, infraProgramInput })
        .onConflictDoUpdate({
          target: tenantMetadataTable.id,
          set: buildConflictUpdateColumns(tenantMetadataTable, [
            "infraProgramInput",
          ]),
        });

      const dispatchId = await dispatchInfra(tenant.id, infraProgramInput);

      return { tenantId: tenant.id, dispatchId };
    });

  export async function dispatchInfra(
    tenantId: Tenant["id"],
    programInput: TenantInfraProgramInput,
  ) {
    const output = await Sqs.sendMessage({
      QueueUrl: Resource.InfraQueue.url,
      MessageBody: JSON.stringify({ tenantId, ...programInput }),
    });
    if (!output.MessageId) throw new Error("Failed to dispatch infra");

    return output.MessageId;
  }
}
