import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import * as R from "remeda";

import { buildConflictUpdateColumns } from "../drizzle/columns";
import { useTransaction } from "../drizzle/context";
import { useTenant } from "../tenants/context";
import { tenantsTable } from "../tenants/sql";
import { Constants } from "../utils/constants";
import { oauth2ProvidersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Tenant } from "../tenants/sql";
import type { Oauth2ProvidersTable } from "./sql";

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

    const tokens = [salt, derivedKey];
    const hash = tokens.join(Constants.TOKEN_DELIMITER);

    return hash;
  }

  export async function verifySecret(secret: string, hash: string) {
    const tokens = hash.split(Constants.TOKEN_DELIMITER);
    if (tokens.length !== 2) return false;
    const [salt, storedKey] = tokens;

    const derivedKey = await deriveKeyFromSecret(secret, salt);

    const storedKeyBuffer = Buffer.from(storedKey, "hex");
    const derivedKeyBuffer = Buffer.from(derivedKey, "hex");
    if (storedKeyBuffer.length !== derivedKeyBuffer.length) return false;

    return timingSafeEqual(storedKeyBuffer, derivedKeyBuffer);
  }

  export const putOauth2Provider = async (
    values: InferInsertModel<Oauth2ProvidersTable>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(oauth2ProvidersTable)
        .values(values)
        .onConflictDoUpdate({
          target: [oauth2ProvidersTable.id, oauth2ProvidersTable.tenantId],
          set: {
            ...buildConflictUpdateColumns(oauth2ProvidersTable, [
              "id",
              "tenantId",
              "kind",
            ]),
            updatedAt: new Date(),
          },
        }),
    );

  export const readOauth2Providers = async () =>
    useTransaction((tx) =>
      tx
        .select()
        .from(oauth2ProvidersTable)
        .where(eq(oauth2ProvidersTable.tenantId, useTenant().id)),
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
