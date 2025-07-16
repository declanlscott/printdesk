import { Schema } from "effect";

export const replicacheMetaTableName = "replicache_meta";
export const replicacheClientGroupsTableName = "replicache_client_groups";
export const replicacheClientsTableName = "replicache_clients";
export const replicacheClientViewsTableName = "replicache_client_views";

export const MutationV0 = Schema.Struct({
  name: Schema.String,
  args: Schema.Any,
  id: Schema.Number,
  timestamp: Schema.Number,
});
export type MutationV0 = Schema.Schema.Type<typeof MutationV0>;

export const MutationV1 = Schema.Struct({
  ...MutationV0.fields,
  clientID: Schema.UUID,
});
export type MutationV1 = Schema.Schema.Type<typeof MutationV1>;

export const PushRequest = Schema.Union(
  Schema.Struct({
    pushVersion: Schema.Literal(0),
    clientID: Schema.UUID,
    mutations: Schema.Array(MutationV0),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }),
  Schema.Struct({
    pushVersion: Schema.Literal(1),
    clientGroupID: Schema.UUID,
    mutations: Schema.Array(MutationV1),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }),
);
export type PushRequest = Schema.Schema.Type<typeof PushRequest>;

export const PullRequest = Schema.Union(
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
export type PullRequest = Schema.Schema.Type<typeof PullRequest>;
