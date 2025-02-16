import { isEqual } from "date-fns";
import { and, eq, getTableName, isNull, or } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";

import { AccessControl } from "../access-control";
import { Auth } from "../auth";
import { Api } from "../backend/api";
import { Documents } from "../backend/documents";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { Papercut } from "../papercut";
import { poke } from "../replicache/poke";
import { Tailscale } from "../tailscale";
import { Sqs } from "../utils/aws";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import { useTenant } from "./context";
import { updateTenantMutationArgsSchema } from "./shared";
import { licensesTable, tenantMetadataTable, tenantsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type {
  InitializeData,
  RegisterData,
  TenantInfraProgramInput,
} from "./shared";
import type { License, Tenant, TenantMetadataTable, TenantsTable } from "./sql";

export namespace Tenants {
  export const put = async (values: InferInsertModel<TenantsTable>) =>
    useTransaction((tx) =>
      tx
        .insert(tenantsTable)
        .values({ ...values, status: "registered" })
        .onConflictDoUpdate({
          target: tenantsTable.id,
          set: buildConflictUpdateColumns(tenantsTable, [
            "slug",
            "name",
            "status",
          ]),
          setWhere: or(
            eq(tenantsTable.status, "registered"),
            eq(tenantsTable.status, "initializing"),
          ),
        })
        .returning()
        .then(R.first()),
    );

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

  export async function isSlugAvailable(slug: Tenant["slug"]) {
    if (["api", "auth", "backend"].includes(slug)) return false;

    const tenant = await useTransaction((tx) =>
      tx
        .select({ status: tenantsTable.status })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, slug))
        .then(R.first()),
    );
    if (!tenant || tenant.status === "registered") return true;

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
              eq(tenantsTable.status, "registered"),
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
            isNull(licensesTable.tenantId),
          ),
        )
        .returning()
        .then(R.first()),
    );

  export const putMetadata = async (
    values: InferInsertModel<TenantMetadataTable>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(tenantMetadataTable)
        .values(values)
        .onConflictDoUpdate({
          target: tenantMetadataTable.id,
          set: buildConflictUpdateColumns(tenantMetadataTable, [
            "infraProgramInput",
            "apiKey",
          ]),
        })
        .returning()
        .then(R.first()),
    );

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

  export async function register(data: RegisterData) {
    const infraProgramInput = {
      papercutSyncCronExpression:
        Constants.DEFAULT_PAPERCUT_SYNC_CRON_EXPRESSION,
      timezone: data.timezone,
    } satisfies TenantInfraProgramInput;

    const apiKey = await Auth.createToken();

    const tenantId = await useTransaction(async () => {
      const tenant = await put({
        slug: data.tenantSlug,
        name: data.tenantName,
      });
      if (!tenant) throw new Error("Failed to create tenant");

      // Assign tenant to license if the tenant was just created
      if (isEqual(tenant.createdAt, tenant.updatedAt)) {
        const license = await assignLicense(tenant.id, data.licenseKey);
        if (!license) throw new Error("Failed to assign tenant to license");
      }

      const oauthProvider = await Auth.putOauth2Provider({
        id: data.userOauthProviderId,
        type: data.userOauthProviderType,
        tenantId: tenant.id,
      });
      if (!oauthProvider) throw new Error("Failed to create oauth provider");

      const metadata = await putMetadata({
        tenantId: tenant.id,
        infraProgramInput,
        apiKey: apiKey.hash,
      });
      if (!metadata) throw new Error("Failed to create tenant metadata");

      return tenant.id;
    });

    const dispatchId = await dispatchInfra(tenantId, infraProgramInput);

    return { tenantId, dispatchId, apiKey: apiKey.value };
  }

  export async function initialize(data: InitializeData) {
    await Promise.all([
      useTransaction((tx) =>
        tx
          .update(tenantsTable)
          .set({ status: "initializing" })
          .where(eq(tenantsTable.id, useTenant().id)),
      ),
      Tailscale.setOauthClient(
        data.tailscaleOauthClientId,
        data.tailscaleOauthClientSecret,
      ),
      Papercut.setTailnetServerUri(data.tailnetPapercutServerUri),
      Papercut.setServerAuthToken(data.papercutServerAuthToken),
      Documents.setMimeTypes(Constants.DEFAULT_DOCUMENTS_MIME_TYPES),
      Documents.setSizeLimit(Constants.DEFAULT_DOCUMENTS_SIZE_LIMIT),
    ]);

    const { eventId: dispatchId } = await Api.papercutSync();

    return { dispatchId };
  }

  export const activate = async () =>
    useTransaction(async (tx) => {
      await tx
        .update(tenantsTable)
        .set({ status: "active" })
        .where(eq(tenantsTable.id, useTenant().id));

      await tx
        .update(tenantMetadataTable)
        .set({ apiKey: null })
        .where(eq(tenantMetadataTable.id, useTenant().id));
    });
}
