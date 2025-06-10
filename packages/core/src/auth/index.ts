import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";
import * as R from "remeda";

import { buildConflictUpdateColumns } from "../database/columns";
import { useTransaction } from "../database/context";
import { useTenant } from "../tenants/context";
import { tenantsTable } from "../tenants/sql";
import { delimitToken, splitToken } from "../utils/shared";
import { identityProvidersTable, identityProviderUserGroupsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Tenant } from "../tenants/sql";
import type {
  IdentityProvider,
  IdentityProvidersTable,
  IdentityProviderUserGroup,
} from "./sql";

export namespace Auth {
  export const generateToken = (size = 32) => randomBytes(size).toString("hex");

  export const deriveKeyFromSecret = (secret: string, salt: string) =>
    new Promise<string>((resolve, reject) =>
      scrypt(secret.normalize(), salt, 64, (err, derivedKey) =>
        err ? reject(err) : resolve(derivedKey.toString("hex")),
      ),
    );

  export async function hashSecret(secret: string) {
    const salt = generateToken(16);

    const derivedKey = await deriveKeyFromSecret(secret, salt);

    return delimitToken(salt, derivedKey);
  }

  export async function verifySecret(secret: string, hash: string) {
    const tokens = splitToken(hash);
    if (tokens.length !== 2) return false;
    const [salt, storedKey] = tokens;

    const derivedKey = await deriveKeyFromSecret(secret, salt);

    const storedKeyBuffer = Buffer.from(storedKey, "hex");
    const derivedKeyBuffer = Buffer.from(derivedKey, "hex");
    if (storedKeyBuffer.length !== derivedKeyBuffer.length) return false;

    return timingSafeEqual(storedKeyBuffer, derivedKeyBuffer);
  }

  export const putIdentityProvider = async (
    values: InferInsertModel<IdentityProvidersTable>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(identityProvidersTable)
        .values(values)
        .onConflictDoUpdate({
          target: [identityProvidersTable.id, identityProvidersTable.tenantId],
          set: {
            ...buildConflictUpdateColumns(identityProvidersTable, [
              "id",
              "tenantId",
              "kind",
            ]),
            updatedAt: new Date(),
          },
        }),
    );

  export const readIdentityProviders = async () =>
    useTransaction((tx) =>
      tx
        .select()
        .from(identityProvidersTable)
        .where(eq(identityProvidersTable.tenantId, useTenant().id)),
    );

  export const readIdentityProviderById = async (id: IdentityProvider["id"]) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(identityProvidersTable)
        .where(
          and(
            eq(identityProvidersTable.id, id),
            eq(identityProvidersTable.tenantId, useTenant().id),
          ),
        )
        .then(R.first()),
    );

  export const readIdentityProvidersBySubdomain = async (
    subdomain: Tenant["subdomain"],
  ) =>
    useTransaction((tx) =>
      tx
        .select({ identityProvider: identityProvidersTable })
        .from(tenantsTable)
        .innerJoin(
          identityProvidersTable,
          eq(tenantsTable.id, identityProvidersTable.tenantId),
        )
        .where(eq(tenantsTable.subdomain, subdomain))
        .then(R.map(R.prop("identityProvider"))),
    );

  export const createIdentityProviderUserGroup = async (
    id: IdentityProviderUserGroup["id"],
    identityProviderId: IdentityProviderUserGroup["identityProviderId"],
  ) =>
    useTransaction((tx) =>
      tx
        .insert(identityProviderUserGroupsTable)
        .values({ id, identityProviderId, tenantId: useTenant().id }),
    );

  export const readIdentityProviderUserGroups = async (
    identityProviderId: IdentityProvider["id"],
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(identityProviderUserGroupsTable)
        .where(
          and(
            eq(
              identityProviderUserGroupsTable.identityProviderId,
              identityProviderId,
            ),
            eq(identityProviderUserGroupsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const deleteIdentityProviderUserGroup = async (
    id: IdentityProviderUserGroup["id"],
    identityProviderId: IdentityProviderUserGroup["identityProviderId"],
  ) =>
    useTransaction((tx) =>
      tx
        .delete(identityProviderUserGroupsTable)
        .where(
          and(
            eq(identityProviderUserGroupsTable.id, id),
            eq(
              identityProviderUserGroupsTable.identityProviderId,
              identityProviderId,
            ),
            eq(identityProviderUserGroupsTable.tenantId, useTenant().id),
          ),
        ),
    );
}
