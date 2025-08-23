import { Array, Data, Schema, Struct } from "effect";

import { TableContract } from "../database2/contract";
import { syncTables } from "../database2/tables";

import type {
  ClientStateNotFoundResponse,
  VersionNotSupportedResponse,
} from "replicache";
import type {
  ReplicacheClientGroupsTable,
  ReplicacheClientsTable,
  ReplicacheClientViewMetadataTable,
  ReplicacheClientViewsTable,
  ReplicacheMetaTable,
} from "./sql";

export namespace ReplicacheMetaContract {
  export const tableName = "replicache_meta";
  export const table = TableContract.NonSync<ReplicacheMetaTable>()(
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
  export const table = TableContract.NonSync<ReplicacheClientGroupsTable>()(
    tableName,
    Schema.Struct({
      id: Schema.UUID,
      tenantId: TableContract.TenantId,
      userId: TableContract.EntityId,
      clientVersion: Schema.Int,
      clientViewVersion: Schema.NullOr(Schema.Int),
      ...TableContract.Timestamps.fields,
    }),
    [],
  );
}

export namespace ReplicacheClientsContract {
  export const tableName = "replicache_clients";
  export const table = TableContract.NonSync<ReplicacheClientsTable>()(
    tableName,
    Schema.Struct({
      id: Schema.UUID,
      tenantId: NanoId,
      clientGroupId: Schema.UUID,
      lastMutationId: Schema.optionalWith(Schema.Int, {
        default: () => 0,
      }),
      version: Schema.Int,
      ...TableContract.Timestamps.fields,
    }),
    [],
  );
}

export namespace ReplicacheClientViewsContract {
  export const tableName = "replicache_client_views";
  export const table = TableContract.NonSync<ReplicacheClientViewsTable>()(
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
    TableContract.NonSync<ReplicacheClientViewMetadataTable>()(
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
  export class MutationV0 extends Schema.TaggedClass<MutationV0>("MutationV0")(
    "MutationV0",
    {
      name: Schema.String,
      args: Schema.Any,
      id: Schema.Number,
      timestamp: Schema.Number,
    },
  ) {}

  export class MutationV1 extends Schema.TaggedClass<MutationV1>("MutationV1")(
    "MutationV1",
    { ...Struct.omit(MutationV0.fields, "_tag"), clientID: Schema.UUID },
  ) {}

  export const Mutation = Schema.Union(MutationV0, MutationV1);

  export class PushRequestV0 extends Schema.Class<PushRequestV0>(
    "PushRequestV0",
  )({
    pushVersion: Schema.tag(0),
    clientID: Schema.UUID,
    mutations: Schema.Array(MutationV0),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }) {}

  export class PushRequestV1 extends Schema.Class<PushRequestV1>(
    "PushRequestV1",
  )({
    pushVersion: Schema.tag(1),
    clientGroupID: Schema.UUID,
    mutations: Schema.Array(MutationV1),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }) {}

  export const PushRequest = Schema.Union(PushRequestV0, PushRequestV1);

  export class PullRequestV0 extends Schema.Class<PullRequestV0>(
    "PullRequestV0",
  )({
    pullVersion: Schema.tag(0),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.NullOr(Schema.Struct({})),
    lastMutationID: Schema.Int,
  }) {}

  export class PullRequestV1 extends Schema.Class<PullRequestV1>(
    "PullRequestV1",
  )({
    pullVersion: Schema.tag(1),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.NullOr(Schema.Struct({ order: Schema.Int })),
    clientGroupID: Schema.UUID,
  }) {}

  export const PullRequest = Schema.Union(PullRequestV0, PullRequestV1);

  export class VersionNotSupportedError extends Data.TaggedError(
    "VersionNotSupportedError",
  )<{ readonly response: VersionNotSupportedResponse }> {}

  export class ClientStateNotFoundError extends Data.TaggedError(
    "ClientStateNotFoundError",
  )<{ readonly response: ClientStateNotFoundResponse }> {}
}
