import { createClient } from "@openauthjs/openauth/client";
import { withActor } from "@printworks/core/actors/context";
import { subjects } from "@printworks/core/auth/subjects";
import { useTransaction } from "@printworks/core/drizzle/context";
import { licensesTable, tenantsTable } from "@printworks/core/tenants/sql";
import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import * as R from "remeda";

export const actor = createMiddleware(async (c, next) => {
  const accessToken = c.req.header("Authorization")?.replace("Bearer ", "");

  if (accessToken) {
    const verified = await createClient({ clientID: "api" }).verify(
      subjects,
      accessToken,
    );

    if (!verified.err)
      return withActor(
        { type: "user", properties: verified.subject.properties },
        next,
      );
  }

  // NOTE: System actor on the api is only used for initializing tenants
  const licenseKey = c.req.header("X-License-Key");
  const tenantId = c.req.header("X-Tenant-Id");
  if (licenseKey && tenantId) {
    const result = await useTransaction((tx) =>
      tx
        .select({ tenantId: tenantsTable.id })
        .from(licensesTable)
        .innerJoin(tenantsTable, eq(licensesTable.tenantId, tenantsTable.id))
        .where(
          and(
            eq(licensesTable.key, licenseKey),
            eq(licensesTable.tenantId, tenantId),
            eq(licensesTable.status, "active"),
            eq(tenantsTable.status, "initializing"),
          ),
        )
        .then(R.first()),
    );

    if (result)
      return withActor(
        {
          type: "system",
          properties: { tenantId: result.tenantId },
        },
        next,
      );
  }

  return withActor({ type: "public", properties: {} }, next);
});
