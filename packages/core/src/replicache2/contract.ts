import * as Data from "effect/Data";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import type {
  ClientStateNotFoundResponse,
  VersionNotSupportedResponse,
} from "replicache";

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
  export type Mutation = typeof Mutation.Type;

  export class PushRequestV0 extends Schema.Class<PushRequestV0>(
    "PushRequestV0",
  )({
    pushVersion: Schema.tag(0),
    clientID: Schema.UUID,
    mutations: MutationV0.pipe(Schema.Array),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }) {}

  export class PushRequestV1 extends Schema.Class<PushRequestV1>(
    "PushRequestV1",
  )({
    pushVersion: Schema.tag(1),
    clientGroupID: Schema.UUID,
    mutations: MutationV1.pipe(Schema.Array),
    profileID: Schema.String,
    schemaVersion: Schema.String,
  }) {}

  export const PushRequest = Schema.Union(PushRequestV0, PushRequestV1);
  export type PushRequest = typeof PushRequest.Type;

  export class PullRequestV0 extends Schema.Class<PullRequestV0>(
    "PullRequestV0",
  )({
    pullVersion: Schema.tag(0),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.Struct({}).pipe(Schema.NullOr),
    lastMutationID: Schema.Int,
  }) {}

  export class PullRequestV1 extends Schema.Class<PullRequestV1>(
    "PullRequestV1",
  )({
    pullVersion: Schema.tag(1),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Schema.Struct({ order: Schema.NonNegativeInt }).pipe(Schema.NullOr),
    clientGroupID: Schema.UUID,
  }) {}

  export const PullRequest = Schema.Union(PullRequestV0, PullRequestV1);
  export type PullRequest = typeof PullRequest.Type;

  export class VersionNotSupportedError extends Data.TaggedError(
    "VersionNotSupportedError",
  )<{ readonly response: VersionNotSupportedResponse }> {}

  export class ClientStateNotFoundError extends Data.TaggedError(
    "ClientStateNotFoundError",
  )<{ readonly response: ClientStateNotFoundResponse }> {}
}
