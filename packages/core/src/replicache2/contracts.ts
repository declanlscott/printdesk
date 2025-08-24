import { Array, Data, Schema, Struct } from "effect";

import { TableContract } from "../database2/contract";
import { syncTables } from "../database2/tables";

import type {
  ClientStateNotFoundResponse,
  VersionNotSupportedResponse,
} from "replicache";
import type {
  ReplicacheClientGroupsSchema,
  ReplicacheClientsSchema,
  ReplicacheClientViewMetadataSchema,
  ReplicacheClientViewsSchema,
  ReplicacheMetaSchema,
} from "./schemas";

export namespace ReplicacheMetaContract {
  export class Row extends Schema.Class<Row>("Row")({
    key: Schema.String,
    value: Schema.Any,
  }) {}

  export const tableName = "replicache_meta";
  export const table = TableContract.Internal<ReplicacheMetaSchema.Table>()(
    tableName,
    Row,
  );
}

export namespace ReplicacheClientGroupsContract {
  export class Row extends Schema.Class<Row>("Row")({
    id: Schema.UUID,
    tenantId: TableContract.TenantId,
    userId: TableContract.EntityId,
    clientVersion: TableContract.Version,
    clientViewVersion: Schema.NullOr(TableContract.Version),
    ...TableContract.Timestamps.fields,
  }) {}

  export const tableName = "replicache_client_groups";
  export const table =
    TableContract.Internal<ReplicacheClientGroupsSchema.Table>()(
      tableName,
      Row,
    );
}

export namespace ReplicacheClientsContract {
  export class Row extends Schema.Class<Row>("Row")({
    id: Schema.UUID,
    tenantId: TableContract.TenantId,
    clientGroupId: Schema.UUID,
    lastMutationId: Schema.optionalWith(Schema.Int, {
      default: () => 0,
    }),
    version: TableContract.Version,
    ...TableContract.Timestamps.fields,
  }) {}

  export const tableName = "replicache_clients";
  export const table = TableContract.Internal<ReplicacheClientsSchema.Table>()(
    tableName,
    Row,
  );
}

export namespace ReplicacheClientViewsContract {
  export class Row extends Schema.Class<Row>("Row")({
    clientGroupId: Schema.UUID,
    version: TableContract.Version,
    clientVersion: TableContract.Version,
    tenantId: TableContract.TenantId,
  }) {}

  export const tableName = "replicache_client_views";
  export const table =
    TableContract.Internal<ReplicacheClientViewsSchema.Table>()(tableName, Row);
}

export namespace ReplicacheClientViewMetadataContract {
  export const entities = Array.map(syncTables, ({ name }) => name);
  export type Entity = (typeof entities)[number];

  export class Row extends Schema.Class<Row>("Row")({
    clientGroupId: Schema.UUID,
    clientViewVersion: TableContract.Version,
    entity: Schema.Literal(...entities),
    entityId: TableContract.EntityId,
    entityVersion: Schema.NullOr(TableContract.Version),
    tenantId: TableContract.TenantId,
  }) {}

  export const tableName = "replicache_client_view_metadata";
  export const table =
    TableContract.Internal<ReplicacheClientViewMetadataSchema.Table>()(
      tableName,
      Row,
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
