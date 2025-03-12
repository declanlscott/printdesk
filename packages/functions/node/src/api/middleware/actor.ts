import { createClient } from "@openauthjs/openauth/client";
import { withActor } from "@printworks/core/actors/context";
import { Auth } from "@printworks/core/auth";
import { subjects } from "@printworks/core/auth/subjects";
import { useTransaction } from "@printworks/core/drizzle/context";
import { tenantMetadataTable } from "@printworks/core/tenants/sql";
import { Constants } from "@printworks/core/utils/constants";
import { and, eq, isNotNull } from "drizzle-orm";
import { bearerAuth } from "hono/bearer-auth";
import { every, some } from "hono/combine";
import { createMiddleware } from "hono/factory";
import * as R from "remeda";

import type { PrivateActor } from "@printworks/core/actors/context";
import type { Context } from "hono";

type Env = { Variables: { privateActor: PrivateActor } };

export const actor = createMiddleware(
  some(
    every(
      bearerAuth({
        async verifyToken(token, c: Context<Env>) {
          const tenantId = c.req.header(Constants.HEADER_NAMES.TENANT_ID);
          if (tenantId) {
            const result = await useTransaction((tx) =>
              tx
                .select({ apiKey: tenantMetadataTable.apiKey })
                .from(tenantMetadataTable)
                .where(
                  and(
                    eq(
                      tenantMetadataTable.tenantId,
                      c.req.header(Constants.HEADER_NAMES.TENANT_ID)!,
                    ),
                    isNotNull(tenantMetadataTable.apiKey),
                  ),
                )
                .then(R.first()),
            );
            if (!result?.apiKey) {
              console.error("Tenant metadata not found or missing API key.");
              return false;
            }

            const verified = await Auth.verifySecret(token, result.apiKey);
            if (!verified) {
              console.error("API key token verification failed.");
              return false;
            }

            c.set("privateActor", {
              kind: Constants.ACTOR_KINDS.SYSTEM,
              properties: { tenantId },
            });
            return true;
          }

          const verified = await createClient({ clientID: "api" }).verify(
            subjects,
            token,
          );

          if (verified.err) {
            console.error("JWT verification failed:", verified.err);
            return false;
          }
          if (verified.subject.type !== Constants.SUBJECT_KINDS.USER) {
            console.error("Invalid subject type:", verified.subject.type);
            return false;
          }

          c.set("privateActor", {
            kind: verified.subject.type,
            properties: verified.subject.properties,
          });

          return true;
        },
      }),
      createMiddleware<Env>((c, next) => withActor(c.var.privateActor, next)),
    ),
    (_, next) =>
      withActor({ kind: Constants.ACTOR_KINDS.PUBLIC, properties: {} }, next),
  ),
);
