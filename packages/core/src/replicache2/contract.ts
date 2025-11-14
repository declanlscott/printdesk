import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Iterable from "effect/Iterable";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns2/contract";
import { Models } from "../models2";
import { Constants } from "../utils/constants";

export namespace ReplicacheContract {
  export class ClientStateNotFoundResponse extends Schema.Class<ClientStateNotFoundResponse>(
    "ClientStateNotFoundResponse",
  )({ error: Schema.tag("ClientStateNotFound") }) {}

  export class ClientStateNotFoundError extends Data.TaggedError(
    "ClientStateNotFoundError",
  ) {
    readonly response: ClientStateNotFoundResponse;

    constructor() {
      super();
      this.response = new ClientStateNotFoundResponse();
    }
  }

  export class VersionNotSupportedResponse extends Schema.Class<VersionNotSupportedResponse>(
    "VersionNotSupportedResponse",
  )({
    error: Schema.tag("VersionNotSupported"),
    versionType: Schema.Literal("push", "pull", "schema").pipe(Schema.optional),
  }) {}

  export class VersionNotSupportedError extends Data.TaggedError(
    "VersionNotSupportedError",
  ) {
    readonly response: VersionNotSupportedResponse;

    constructor(
      versionType: NonNullable<VersionNotSupportedResponse["versionType"]>,
    ) {
      super();
      this.response = new VersionNotSupportedResponse({ versionType });
    }
  }

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
    clientGroupId: Schema.propertySignature(Schema.UUID).pipe(
      Schema.fromKey("clientGroupID"),
    ),
    mutations: MutationV1.pipe(Schema.Array),
    profileId: Schema.propertySignature(Schema.UUID).pipe(
      Schema.fromKey("profileID"),
    ),
    schemaVersion: Schema.String,
  }) {}

  export const PushRequest = Schema.Union(PushRequestV0, PushRequestV1);
  export type PushRequest = typeof PushRequest.Type;

  export const PushResponse = Schema.Union(
    Schema.Undefined,
    ClientStateNotFoundResponse,
    VersionNotSupportedResponse,
  );
  export type PushResponse = typeof PushResponse.Type;

  export const Cookie = Schema.Struct({ order: ColumnsContract.Version }).pipe(
    Schema.NullOr,
  );

  export class PullRequestV0 extends Schema.Class<PullRequestV0>(
    "PullRequestV0",
  )({
    pullVersion: Schema.tag(0),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Cookie,
    lastMutationID: Schema.Int,
  }) {}

  export class PullRequestV1 extends Schema.Class<PullRequestV1>(
    "PullRequestV1",
  )({
    pullVersion: Schema.tag(1),
    schemaVersion: Schema.String,
    profileID: Schema.String,
    cookie: Cookie,
    clientGroupId: Schema.propertySignature(Schema.UUID).pipe(
      Schema.fromKey("clientGroupID"),
    ),
  }) {}

  export const PullRequest = Schema.Union(PullRequestV0, PullRequestV1);
  export type PullRequest = typeof PullRequest.Type;

  const tableKey = <TName extends Models.SyncTableName>(name: TName) =>
    Schema.String.pipe(
      Schema.pattern(
        new RegExp(
          `^${name}/[${Constants.NANOID_ALPHABET}]{${Constants.NANOID_LENGTH}}$`,
        ),
      ),
    );

  export class PutSyncStateOperation extends Schema.Class<PutSyncStateOperation>(
    "PutSyncStateOperation",
  )({
    op: Schema.tag("put"),
    key: Schema.tag(Constants.REPLICACHE_SYNC_STATE_KEY),
    value: Schema.Literal("PARTIAL", "COMPLETE"),
  }) {}

  export const PutTableOperation = Models.SyncTables.pipe(
    Effect.map(Struct.omit("_tag")),
    Effect.map(Record.values),
    Effect.map(
      Iterable.map((table) =>
        Schema.Struct({
          op: Schema.tag("put"),
          key: tableKey(table.name),
          value: table.DataTransferObject,
        }),
      ),
    ),
    Effect.map((members) => Schema.Union(...members)),
  );
  export type PutTableOperation = Effect.Effect.Success<
    typeof PutTableOperation
  >["Type"];

  export const PutOperation = PutTableOperation.pipe(
    Effect.map((PutTableOperation) =>
      Schema.Union(PutTableOperation, PutSyncStateOperation),
    ),
  );
  export type PutOperation = Effect.Effect.Success<typeof PutOperation>["Type"];

  export const makePutTableOperation = <TTable extends Models.SyncTable>({
    table,
    value,
  }: {
    table: TTable;
    value: TTable["DataTransferObject"]["Type"];
  }): PutTableOperation =>
    Schema.Struct({
      op: Schema.tag("put"),
      key: tableKey(table.name),
      value: table.DataTransferObject,
    }).make({ key: `${table.name}/${value.id}`, value });

  export const DeleteTableOperation = Schema.Union(
    ...Iterable.map(Models.syncTables, (table) =>
      Schema.Struct({
        op: Schema.tag("del"),
        key: tableKey(table.name),
      }),
    ),
  );
  export type DeleteTableOperation = typeof DeleteTableOperation.Type;

  export const makeDeleteTableOperation = <TTable extends Models.SyncTable>({
    table,
    id,
  }: {
    table: TTable;
    id: TTable["DataTransferObject"]["Type"]["id"];
  }): DeleteTableOperation =>
    Schema.Struct({ op: Schema.tag("del"), key: tableKey(table.name) }).make({
      key: `${table.name}/${id}`,
    });

  export const DeleteOperation = DeleteTableOperation;
  export type DeleteOperation = typeof DeleteOperation.Type;

  export class ClearOperation extends Schema.Class<ClearOperation>("Clear")({
    op: Schema.tag("clear"),
  }) {}

  export const PatchOperation = PutOperation.pipe(
    Effect.map((PutOperation) =>
      Schema.Union(PutOperation, DeleteOperation, ClearOperation),
    ),
  );
  export type PatchOperation = Effect.Effect.Success<
    typeof PatchOperation
  >["Type"];

  export const PullResponseOkV0 = PatchOperation.pipe(
    Effect.map((PatchOperation) =>
      Schema.Struct({
        cookie: Cookie,
        lastMutationID: Schema.Int,
        patch: PatchOperation.pipe(Schema.Chunk),
      }),
    ),
  );
  export type PullResponseOkV0 = Effect.Effect.Success<
    typeof PullResponseOkV0
  >["Type"];

  export const PullResponseV0 = PullResponseOkV0.pipe(
    Effect.map((PullResponseOk) =>
      Schema.Union(
        PullResponseOk,
        ClientStateNotFoundResponse,
        VersionNotSupportedResponse,
      ),
    ),
  );
  export type PullResponseV0 = Effect.Effect.Success<
    typeof PullResponseV0
  >["Type"];

  export const PullResponseOkV1 = PatchOperation.pipe(
    Effect.map((PatchOperation) =>
      Schema.Struct({
        cookie: Cookie,
        lastMutationIdChanges: Schema.propertySignature(
          Schema.Record({
            key: Schema.UUID,
            value: ColumnsContract.Version,
          }),
        ).pipe(Schema.fromKey("lastMutationIDChanges")),
        patch: PatchOperation.pipe(Schema.Chunk),
      }),
    ),
  );
  export type PullResponseOkV1 = Effect.Effect.Success<
    typeof PullResponseOkV1
  >["Type"];

  export const PullResponseV1 = PullResponseOkV1.pipe(
    Effect.map((PullResponseOk) =>
      Schema.Union(
        PullResponseOk,
        ClientStateNotFoundResponse,
        VersionNotSupportedResponse,
      ),
    ),
  );
  export type PullResponseV1 = Effect.Effect.Success<
    typeof PullResponseV1
  >["Type"];

  export const PullResponse = Effect.all([PullResponseV0, PullResponseV1]).pipe(
    Effect.map((members) => Schema.Union(...members)),
  );
  export type PullResponse = Effect.Effect.Success<typeof PullResponse>["Type"];
}
