import * as v from "valibot";

import { announcementMutationNames } from "../announcements/shared";
import { billingAccountMutationNames } from "../billing-accounts/shared";
import { commentMutationNames } from "../comments/shared";
import { invoiceMutationNames } from "../invoices/shared";
import { orderMutationNames } from "../orders/shared";
import { productMutationNames } from "../products/shared";
import {
  deliveryOptionsMutationNames,
  roomMutationNames,
  workflowMutationNames,
} from "../rooms/shared";
import { tenantMutationNames } from "../tenants/shared";
import { userMutationNames } from "../users/shared";

import type { ReadonlyJSONObject } from "replicache";
import type { SuperJSONResult } from "superjson";

export const replicacheMetaTableName = "replicache_meta";
export const replicacheClientGroupsTableName = "replicache_client_groups";
export const replicacheClientsTableName = "replicache_clients";
export const replicacheClientViewsTableName = "replicache_client_views";

export const mutationV0Schema = v.object({
  name: v.string(),
  args: v.any(),
  id: v.number(),
  timestamp: v.number(),
});
export type MutationV0 = v.InferOutput<typeof mutationV0Schema>;

export const mutationV1Schema = v.object({
  ...mutationV0Schema.entries,
  clientID: v.pipe(v.string(), v.uuid()),
});
export type MutationV1 = v.InferOutput<typeof mutationV1Schema>;

export const mutationNameSchema = v.picklist([
  ...announcementMutationNames,
  ...billingAccountMutationNames,
  ...commentMutationNames,
  ...deliveryOptionsMutationNames,
  ...invoiceMutationNames,
  ...orderMutationNames,
  ...tenantMutationNames,
  ...productMutationNames,
  ...roomMutationNames,
  ...userMutationNames,
  ...workflowMutationNames,
]);
export type MutationName = v.InferOutput<typeof mutationNameSchema>;

export const pushRequestSchema = v.variant("pushVersion", [
  v.looseObject({
    pushVersion: v.literal(0),
    clientID: v.pipe(v.string(), v.uuid()),
    mutations: v.array(mutationV0Schema),
    profileID: v.string(),
    schemaVersion: v.string(),
  }),
  v.object({
    pushVersion: v.literal(1),
    clientGroupID: v.pipe(v.string(), v.uuid()),
    mutations: v.array(mutationV1Schema),
    profileID: v.string(),
    schemaVersion: v.string(),
  }),
]);
export type PushRequest = v.InferOutput<typeof pushRequestSchema>;

export const pullRequestSchema = v.variant("pullVersion", [
  v.object({
    pullVersion: v.literal(0),
    schemaVersion: v.string(),
    profileID: v.string(),
    cookie: v.nullable(v.looseObject({})),
    lastMutationID: v.number(),
  }),
  v.object({
    pullVersion: v.literal(1),
    schemaVersion: v.string(),
    profileID: v.string(),
    cookie: v.nullable(v.object({ order: v.number() })),
    clientGroupID: v.pipe(v.string(), v.uuid()),
  }),
]);
export type PullRequest = v.InferOutput<typeof pullRequestSchema>;

export type Serialized = ReadonlyJSONObject & SuperJSONResult;

export const isSerialized = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
): value is SuperJSONResult => typeof value === "object" && "json" in value;
