import { and, eq, getTableName, isNull, or, sql } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";

import { AccessControl } from "../access-control";
import { Auth } from "../auth";
import { oauth2ProvidersTable } from "../auth/sql";
import { Sqs } from "../aws";
import { Documents } from "../backend/documents";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { SharedErrors } from "../errors/shared";
import { Papercut } from "../papercut";
import { poke } from "../replicache/poke";
import { Tailscale } from "../tailscale";
import { Constants } from "../utils/constants";
import { fn, generateId } from "../utils/shared";
import { useTenant } from "./context";
import { updateTenantMutationArgsSchema } from "./shared";
import { licensesTable, tenantMetadataTable, tenantsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Oauth2Provider } from "../auth/sql";
import type { ConfigureData, InfraProgramInput, RegisterData } from "./shared";
import type { License, Tenant, TenantMetadataTable, TenantsTable } from "./sql";

export namespace Tenants {
  export const put = async (values: InferInsertModel<TenantsTable>) =>
    useTransaction((tx) =>
      tx
        .insert(tenantsTable)
        .values({ ...values, status: "setup" })
        .onConflictDoUpdate({
          target: [tenantsTable.id],
          set: {
            ...buildConflictUpdateColumns(tenantsTable, [
              "id",
              "name",
              "subdomain",
              "status",
            ]),
            version: sql`${tenantsTable.version} + 1`,
            updatedAt: new Date(),
          },
          setWhere: eq(tenantsTable.status, "setup"),
        }),
    );

  export const read = async () =>
    useTransaction((tx) =>
      tx.select().from(tenantsTable).where(eq(tenantsTable.id, useTenant().id)),
    );

  export const byOauth2Provider = async (
    kind: Oauth2Provider["kind"],
    id: Oauth2Provider["id"],
  ) =>
    useTransaction((tx) =>
      tx
        .select({ tenant: tenantsTable })
        .from(tenantsTable)
        .innerJoin(
          oauth2ProvidersTable,
          eq(oauth2ProvidersTable.tenantId, tenantsTable.id),
        )
        .where(
          and(
            eq(oauth2ProvidersTable.kind, kind),
            eq(oauth2ProvidersTable.id, id),
          ),
        )
        .then((rows) => R.pipe(rows, R.map(R.prop("tenant")), R.first())),
    );

  export const update = fn(updateTenantMutationArgsSchema, async (values) => {
    await AccessControl.enforce([getTableName(tenantsTable), "update"], {
      Error: SharedErrors.AccessDenied,
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

  export async function isSubdomainAvailable(subdomain: Tenant["subdomain"]) {
    if (["api", "auth", "backend"].includes(subdomain)) return false;

    const tenant = await useTransaction((tx) =>
      tx
        .select({ status: tenantsTable.status })
        .from(tenantsTable)
        .where(eq(tenantsTable.subdomain, subdomain))
        .then(R.first()),
    );
    if (!tenant || tenant.status === "setup") return true;

    return false;
  }

  export const isLicenseKeyAvailable = async (licenseKey: License["key"]) =>
    useTransaction((tx) =>
      tx
        .select({})
        .from(licensesTable)
        .leftJoin(tenantsTable, eq(tenantsTable.id, licensesTable.tenantId))
        .where(
          and(
            eq(licensesTable.key, licenseKey),
            eq(licensesTable.status, "active"),
            or(
              isNull(licensesTable.tenantId),
              eq(tenantsTable.status, "setup"),
            ),
          ),
        )
        .then(R.isNot(R.isEmpty)),
    );

  export const assignLicense = async (
    tenantId: Tenant["id"],
    licenseKey: License["key"],
  ) =>
    useTransaction((tx) =>
      tx
        .update(licensesTable)
        .set({ tenantId })
        .where(
          and(
            eq(licensesTable.key, licenseKey),
            or(
              isNull(licensesTable.tenantId),
              eq(licensesTable.tenantId, tenantId),
            ),
          ),
        ),
    );

  export const putMetadata = async (
    values: InferInsertModel<TenantMetadataTable>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(tenantMetadataTable)
        .values(values)
        .onConflictDoUpdate({
          target: [tenantMetadataTable.tenantId],
          set: {
            ...buildConflictUpdateColumns(tenantMetadataTable, [
              "infraProgramInput",
              "apiKey",
            ]),
            updatedAt: new Date(),
          },
        }),
    );

  export const readMetadata = async () =>
    useTransaction((tx) =>
      tx
        .select()
        .from(tenantMetadataTable)
        .where(eq(tenantMetadataTable.tenantId, useTenant().id))
        .then(R.first()),
    );

  export async function initialize(
    licenseKey: License["key"],
    infraProgramInput: InfraProgramInput,
  ) {
    const tenantId = generateId();
    const apiKey = Auth.generateToken();
    const hash = await Auth.hashSecret(apiKey);

    await useTransaction(() =>
      Promise.all([
        assignLicense(tenantId, licenseKey),
        putMetadata({ tenantId, apiKey: hash, infraProgramInput }),
      ]),
    );

    return { tenantId, apiKey };
  }

  export const register = async (data: RegisterData) =>
    useTransaction(() =>
      Promise.all([
        put({
          id: useTenant().id,
          name: data.tenantName,
          subdomain: data.tenantSubdomain,
        }),
        Auth.putOauth2Provider({
          id: data.userOauthProviderId,
          kind: data.userOauthProviderKind,
          tenantId: useTenant().id,
        }),
      ]),
    );

  export async function dispatchInfra() {
    const programInput = await useTransaction((tx) =>
      tx
        .select({ programInput: tenantMetadataTable.infraProgramInput })
        .from(tenantMetadataTable)
        .where(eq(tenantMetadataTable.tenantId, useTenant().id))
        .then((rows) => R.pipe(rows, R.map(R.prop("programInput")), R.first())),
    );
    if (!programInput) throw new Error("Tenant metadata not found");

    const output = await Sqs.sendMessage({
      QueueUrl: Resource.InfraQueue.url,
      MessageBody: JSON.stringify({
        tenantId: useTenant().id,
        ...programInput,
      }),
    });
    if (!output.MessageId) throw new Error("Failed to dispatch infra");

    return output.MessageId;
  }

  export const config = async (data: ConfigureData) =>
    Promise.all([
      Tailscale.setOauthClient(
        data.tailscaleOauthClientId,
        data.tailscaleOauthClientSecret,
      ),
      Papercut.setTailnetServerUri(data.tailnetPapercutServerUri),
      Papercut.setServerAuthToken(data.papercutServerAuthToken),
      Documents.setMimeTypes(Constants.DEFAULT_DOCUMENTS_MIME_TYPES),
      Documents.setSizeLimit(Constants.DEFAULT_DOCUMENTS_SIZE_LIMIT),
    ]);

  export const activate = async () =>
    useTransaction((tx) =>
      Promise.all([
        tx
          .update(tenantsTable)
          .set({ status: "active" })
          .where(eq(tenantsTable.id, useTenant().id)),
        tx
          .update(tenantMetadataTable)
          .set({ apiKey: null })
          .where(eq(tenantMetadataTable.tenantId, useTenant().id)),
      ]),
    );
}
