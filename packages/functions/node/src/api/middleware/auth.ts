import { AccessControl } from "@printworks/core/access-control";
import { assertActor, withActor } from "@printworks/core/actors/context";
import { Auth } from "@printworks/core/auth";
import { useTransaction } from "@printworks/core/drizzle/context";
import {
  Tenant,
  tenantMetadataTable,
  tenantsTable,
} from "@printworks/core/tenants/sql";
import { HttpError } from "@printworks/core/utils/errors";
import { and, eq, isNotNull } from "drizzle-orm";
import { bearerAuth } from "hono/bearer-auth";
import { every } from "hono/combine";
import { createMiddleware } from "hono/factory";
import * as R from "remeda";

import type { Action, Resource } from "@printworks/core/access-control/shared";

/**
 * NOTE: Depends on actor middleware
 */
export const authn = createMiddleware((_, next) => {
  try {
    assertActor("user");
  } catch {
    throw new HttpError.Unauthorized();
  }

  return next();
});

/**
 * NOTE: Depends on user middleware
 */
export const authz = (resource: Resource, action: Action) =>
  createMiddleware(async (_, next) => {
    await AccessControl.enforce([resource, action], {
      Error: HttpError.Forbidden,
      args: [],
    });

    return next();
  });

export const registrationAuthz = (
  status: Extract<Tenant["status"], "registered" | "initializing">,
) =>
  createMiddleware(
    every(
      bearerAuth({
        async verifyToken(token, c) {
          const result = await useTransaction(async (tx) =>
            tx
              .select({ apiKey: tenantMetadataTable.apiKey })
              .from(tenantsTable)
              .innerJoin(
                tenantMetadataTable,
                eq(tenantMetadataTable.tenantId, tenantsTable.id),
              )
              .where(
                and(
                  eq(tenantsTable.id, c.req.header("X-Tenant-Id")!),
                  eq(tenantsTable.status, status),
                  isNotNull(tenantMetadataTable.apiKey),
                ),
              )
              .then(R.first()),
          );
          if (!result || !result.apiKey) {
            console.error("Tenant not found or missing API key");
            return false;
          }

          return Auth.verifyToken(token, result.apiKey);
        },
      }),
      (c, next) =>
        withActor(
          {
            type: "system",
            properties: { tenantId: c.req.header("X-Tenant-Id")! },
          },
          next,
        ),
    ),
  );
