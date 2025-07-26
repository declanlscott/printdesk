import { Schema } from "effect";

import { NonSyncTable, Timestamps } from "../database2/shared";
import { NanoId } from "../utils2/shared";

import type {
  ReplicacheClientGroupsTable,
  ReplicacheClientsTable,
  ReplicacheClientViewsTable,
  ReplicacheMetaTable,
} from "./sql";

// TODO: Client view record schema
export const ReplicacheClientViewRecord = Schema.Struct({});

export const replicacheMetaTableName = "replicache_meta";
export const replicacheMetaTable = NonSyncTable<ReplicacheMetaTable>()(
  replicacheMetaTableName,
  Schema.Struct({
    key: Schema.String,
    value: Schema.Any,
  }),
  [],
);

export const replicacheClientGroupsTableName = "replicache_client_groups";
export const replicacheClientGroupsTable =
  NonSyncTable<ReplicacheClientGroupsTable>()(
    replicacheClientGroupsTableName,
    Schema.Struct({
      id: Schema.UUID,
      tenantId: NanoId,
      userId: NanoId,
      cvrVersion: Schema.Int,
      ...Timestamps.fields,
    }),
    [],
  );

export const replicacheClientsTableName = "replicache_clients";
export const replicacheClientsTable = NonSyncTable<ReplicacheClientsTable>()(
  replicacheClientsTableName,
  Schema.Struct({
    id: Schema.UUID,
    tenantId: NanoId,
    clientGroupId: Schema.UUID,
    lastMutationId: Schema.Int,
    ...Timestamps.fields,
  }),
  [],
);

export const replicacheClientViewsTableName = "replicache_client_views";
export const replicacheClientViewsTable =
  NonSyncTable<ReplicacheClientViewsTable>()(
    replicacheClientViewsTableName,
    Schema.Struct({
      tenantId: NanoId,
      clientGroupId: Schema.UUID,
      version: Schema.Int,
      record: ReplicacheClientViewRecord,
      ...Timestamps.fields,
    }),
    [],
  );

export const ReplicacheMutationV0 = Schema.Struct({
  name: Schema.String,
  args: Schema.Any,
  id: Schema.Number,
  timestamp: Schema.Number,
});
export type ReplicacheMutationV0 = Schema.Schema.Type<
  typeof ReplicacheMutationV0
>;

export const ReplicacheMutationV1 = Schema.Struct({
  ...ReplicacheMutationV0.fields,
  clientID: Schema.UUID,
});
export type ReplicacheMutationV1 = Schema.Schema.Type<
  typeof ReplicacheMutationV1
>;

export const ReplicachePushRequest = Schema.Union(
  Schema.Struct({
    pushVersion: Schema.Literal(0),
    clientID: Schema.UUID,
    mutations: Schema.Array(ReplicacheMutationV0),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }),
  Schema.Struct({
    pushVersion: Schema.Literal(1),
    clientGroupID: Schema.UUID,
    mutations: Schema.Array(ReplicacheMutationV1),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }),
);
export type ReplicachePushRequest = Schema.Schema.Type<
  typeof ReplicachePushRequest
>;

export const ReplicachePullRequest = Schema.Union(
  Schema.Struct({
    pullVersion: Schema.Literal(0),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.NullOr(Schema.Struct({})),
    lastMutationID: Schema.Int,
  }),
  Schema.Struct({
    pullVersion: Schema.Literal(1),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.NullOr(Schema.Struct({ order: Schema.Int })),
    clientGroupID: Schema.UUID,
  }),
);
export type ReplicachePullRequest = Schema.Schema.Type<
  typeof ReplicachePullRequest
>;
