import { randomBytes } from "node:crypto";

import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import * as R from "remeda";

import { buildConflictUpdateColumns } from "../drizzle/columns";
import { useTransaction } from "../drizzle/context";
import { tenantsTable } from "../tenants/sql";
import { oauth2ProvidersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Tenant } from "../tenants/sql";
import type { Oauth2ProvidersTable } from "./sql";

export namespace Auth {
  export async function generateToken() {
    const value = randomBytes(32).toString("hex");

    return {
      value,
      hash: await hash(value, 10),
    };
  }

  export const verifyToken = compare;

  export const putOauth2Provider = async (
    values: InferInsertModel<Oauth2ProvidersTable>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(oauth2ProvidersTable)
        .values(values)
        .onConflictDoUpdate({
          target: [oauth2ProvidersTable.id, oauth2ProvidersTable.tenantId],
          set: buildConflictUpdateColumns(oauth2ProvidersTable, [
            "id",
            "tenantId",
            "type",
          ]),
        }),
    );

  export const readOauth2ProvidersBySlug = async (slug: Tenant["slug"]) =>
    useTransaction((tx) =>
      tx
        .select({ oauth2Provider: oauth2ProvidersTable })
        .from(tenantsTable)
        .innerJoin(
          oauth2ProvidersTable,
          eq(tenantsTable.id, oauth2ProvidersTable.tenantId),
        )
        .where(eq(tenantsTable.slug, slug))
        .then(R.map(R.prop("oauth2Provider"))),
    );
}
