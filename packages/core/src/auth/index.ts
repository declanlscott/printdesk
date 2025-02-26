import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

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
  export const generateToken = (size = 32) => randomBytes(size).toString("hex");

  export const deriveKeyFromSecret = (secret: string, salt: string) =>
    new Promise<string>((resolve, reject) =>
      scrypt(secret.normalize(), salt, 64, (err, derivedKey) =>
        err ? reject(err) : resolve(derivedKey.toString("hex")),
      ),
    );

  const hashSeparator = ":";

  export async function hashSecret(secret: string) {
    const salt = generateToken(16);

    const derivedKey = await deriveKeyFromSecret(secret, salt);

    const hashParts = [salt, derivedKey];
    const hash = hashParts.join(hashSeparator);

    return hash;
  }

  export async function verifySecret(secret: string, hash: string) {
    const hashParts = hash.split(hashSeparator);
    if (hashParts.length !== 2) return false;
    const [salt, storedKey] = hashParts;

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
