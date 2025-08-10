import { Array, Data, Schema } from "effect";

import { DatabaseContract } from "../database2/contract";
import { syncTables } from "../database2/tables";
import { NanoId } from "../utils2/shared";

import type { VersionNotSupportedResponse } from "replicache";
import type {
  ReplicacheClientGroupsTable,
  ReplicacheClientsTable,
  ReplicacheClientViewMetadataTable,
  ReplicacheClientViewsTable,
  ReplicacheMetaTable,
} from "./sql";

export namespace ReplicacheMetaContract {
  export const tableName = "replicache_meta";
  export const table = DatabaseContract.NonSyncTable<ReplicacheMetaTable>()(
    tableName,
    Schema.Struct({
      key: Schema.String,
      value: Schema.Any,
    }),
    [],
  );
}

export namespace ReplicacheClientGroupsContract {
  export const tableName = "replicache_client_groups";
  export const table =
    DatabaseContract.NonSyncTable<ReplicacheClientGroupsTable>()(
      tableName,
      Schema.Struct({
        id: Schema.UUID,
        tenantId: NanoId,
        userId: NanoId,
        clientViewVersion: Schema.NullOr(Schema.Int),
        lastMutationId: Schema.Int,
        ...DatabaseContract.Timestamps.fields,
      }),
      [],
    );
}

export namespace ReplicacheClientsContract {
  export const tableName = "replicache_clients";
  export const table = DatabaseContract.NonSyncTable<ReplicacheClientsTable>()(
    tableName,
    Schema.Struct({
      id: Schema.UUID,
      tenantId: NanoId,
      clientGroupId: Schema.UUID,
      lastMutationId: Schema.Int,
      version: Schema.Int,
      ...DatabaseContract.Timestamps.fields,
    }),
    [],
  );
}

export namespace ReplicacheClientViewsContract {
  export const tableName = "replicache_client_views";
  export const table =
    DatabaseContract.NonSyncTable<ReplicacheClientViewsTable>()(
      tableName,
      Schema.Struct({
        clientGroupId: Schema.UUID,
        version: Schema.Int,
        clientVersion: Schema.Int,
        tenantId: NanoId,
      }),
      [],
    );
}

export namespace ReplicacheClientViewMetadataContract {
  export const entities = Array.map(syncTables, ({ name }) => name);
  export type Entity = (typeof entities)[number];

  export const tableName = "replicache_client_view_metadata";
  export const table =
    DatabaseContract.NonSyncTable<ReplicacheClientViewMetadataTable>()(
      tableName,
      Schema.Struct({
        clientGroupId: Schema.UUID,
        clientViewVersion: Schema.Int,
        entity: Schema.Literal(...entities),
        entityId: NanoId,
        entityVersion: Schema.NullOr(Schema.Int),
        tenantId: NanoId,
      }),
      [],
    );
}

export namespace ReplicacheContract {
  export const MutationV0 = Schema.Struct({
    name: Schema.String,
    args: Schema.Any,
    id: Schema.Number,
    timestamp: Schema.Number,
  });

  export const MutationV1 = Schema.Struct({
    ...MutationV0.fields,
    clientID: Schema.UUID,
  });

  export const PushRequestV0 = Schema.Struct({
    pushVersion: Schema.Literal(0),
    clientID: Schema.UUID,
    mutations: Schema.Array(MutationV0),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  });

  export const PushRequestV1 = Schema.Struct({
    pushVersion: Schema.Literal(1),
    clientGroupID: Schema.UUID,
    mutations: Schema.Array(MutationV1),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  });

  export const PushRequest = Schema.Union(PushRequestV0, PushRequestV1);

  export const PullRequestV0 = Schema.Struct({
    pullVersion: Schema.Literal(0),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.NullOr(Schema.Struct({})),
    lastMutationID: Schema.Int,
  });

  export const PullRequestV1 = Schema.Struct({
    pullVersion: Schema.Literal(1),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.NullOr(Schema.Struct({ order: Schema.Int })),
    clientGroupID: Schema.UUID,
  });

  export const PullRequest = Schema.Union(PullRequestV0, PullRequestV1);

  export class VersionNotSupportedError extends Data.TaggedError(
    "VersionNotSupportedError",
  )<{ readonly response: VersionNotSupportedResponse }> {}
}
