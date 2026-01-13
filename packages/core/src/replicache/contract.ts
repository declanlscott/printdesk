import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { Models } from "../models";
import { Constants } from "../utils/constants";

import type { ReplicachePuller } from "./pull";
import type { ReplicachePusher } from "./push";

export namespace ReplicacheContract {
  export class Puller extends Context.Tag("@printdesk/core/replicache/Puller")<
    Puller,
    ReplicachePuller.Type
  >() {}

  export class Pusher extends Context.Tag("@printdesk/core/replicache/Pusher")<
    Pusher,
    ReplicachePusher.Type
  >() {}

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
    clientGroupId: Schema.UUID.pipe(
      Schema.propertySignature,
      Schema.fromKey("clientGroupId"),
    ),
    mutations: MutationV1.pipe(Schema.Array),
    profileId: Schema.UUID.pipe(
      Schema.propertySignature,
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
    clientGroupId: Schema.UUID.pipe(
      Schema.propertySignature,
      Schema.fromKey("clientGroupId"),
    ),
  }) {}

  export const PullRequest = Schema.Union(PullRequestV0, PullRequestV1);
  export type PullRequest = typeof PullRequest.Type;

  export const tableKey = <TName extends Models.SyncTableName>(name: TName) =>
    Schema.TemplateLiteralParser(
      Schema.Literal(name),
      Schema.Literal("/"),
      ColumnsContract.EntityId,
    );
  export type TableKey<TName extends Models.SyncTableName> = ReturnType<
    typeof tableKey<TName>
  >["Type"];

  export class PutSyncStateOperation extends Schema.Class<PutSyncStateOperation>(
    "PutSyncStateOperation",
  )({
    op: Schema.tag("put"),
    key: Schema.tag(Constants.REPLICACHE_SYNC_STATE_KEY),
    value: Schema.Literal("PARTIAL", "COMPLETE"),
  }) {}

  const makePutTableOperationSchema = <TTable extends Models.SyncTable>(
    table: TTable,
  ) =>
    Schema.Struct({
      op: Schema.tag("put"),
      key: tableKey(table.name),
      value: table.DataTransferObject,
    });

  type PutTableOperationStruct<TName extends Models.SyncTableName> =
    Schema.Struct<{
      op: Schema.tag<"put">;
      key: Schema.TemplateLiteralParser<
        [
          Schema.Literal<[TName]>,
          Schema.Literal<["/"]>,
          typeof ColumnsContract.EntityId,
        ]
      >;
      value: Models.SyncTableByName<TName>["DataTransferObject"];
    }>;

  export const putTableOperationSchemas = Record.map(
    Models.syncTables,
    makePutTableOperationSchema,
  ) as {
    readonly [TName in Models.SyncTableName]: PutTableOperationStruct<TName>;
  };

  export const PutTableOperation = Schema.Union(
    ...Record.values(putTableOperationSchemas),
  );
  export type PutTableOperation = typeof PutTableOperation.Type;

  export const makePutTableOperation = <TTable extends Models.SyncTable>({
    table,
    value,
  }: {
    table: TTable;
    value: TTable["DataTransferObject"]["Type"];
  }) =>
    ({
      op: "put",
      key: [table.name, "/", value.id] as const,
      value,
    }) as Extract<PutTableOperation, { key: TableKey<TTable["name"]> }>;

  export const PutOperation = Schema.Union(
    PutTableOperation,
    PutSyncStateOperation,
  );
  export type PutOperation = typeof PutOperation.Type;

  const makeDeleteTableOperationSchema = <TTable extends Models.SyncTable>(
    table: TTable,
  ) => Schema.Struct({ op: Schema.tag("del"), key: tableKey(table.name) });

  type DeleteTableOperationStruct<TName extends Models.SyncTableName> =
    Schema.Struct<{
      op: Schema.tag<"del">;
      key: Schema.TemplateLiteralParser<
        [
          Schema.Literal<[TName]>,
          Schema.Literal<["/"]>,
          typeof ColumnsContract.EntityId,
        ]
      >;
    }>;

  export const deleteTableOperationSchemas = Record.map(
    Models.syncTables,
    makeDeleteTableOperationSchema,
  ) as {
    readonly [TName in Models.SyncTableName]: DeleteTableOperationStruct<TName>;
  };

  export const DeleteTableOperation = Schema.Union(
    ...Record.values(deleteTableOperationSchemas),
  );
  export type DeleteTableOperation = typeof DeleteTableOperation.Type;

  export const makeDeleteTableOperation = <TTable extends Models.SyncTable>({
    table,
    id,
  }: {
    table: TTable;
    id: TTable["DataTransferObject"]["Type"]["id"];
  }) =>
    ({
      op: "del",
      key: [table.name, "/", id] as const,
    }) as Extract<DeleteTableOperation, { key: TableKey<TTable["name"]> }>;

  export const DeleteOperation = DeleteTableOperation;
  export type DeleteOperation = typeof DeleteOperation.Type;

  export class ClearOperation extends Schema.Class<ClearOperation>("Clear")({
    op: Schema.tag("clear"),
  }) {}

  export const PatchOperation = Schema.Union(
    PutOperation,
    DeleteOperation,
    ClearOperation,
  );
  export type PatchOperation = typeof PatchOperation.Type;

  export class PullResponseOkV0 extends Schema.Class<PullResponseOkV0>(
    "PullResponseOkV0",
  )({
    cookie: Cookie,
    lastMutationID: Schema.Int,
    patch: PatchOperation.pipe(Schema.Chunk),
  }) {}

  export const PullResponseV0 = Schema.Union(
    PullResponseOkV0,
    ClientStateNotFoundResponse,
    VersionNotSupportedResponse,
  );
  export type PullResponseV0 = typeof PullResponseV0.Type;

  export class PullResponseOkV1 extends Schema.Class<PullResponseOkV1>(
    "PullResponseOkV1",
  )({
    cookie: Cookie,
    lastMutationIdChanges: Schema.Record({
      key: Schema.UUID,
      value: ColumnsContract.Version,
    }).pipe(Schema.propertySignature, Schema.fromKey("lastMutationIDChanges")),
    patch: PatchOperation.pipe(Schema.Chunk),
  }) {}

  export const PullResponseV1 = Schema.Union(
    PullResponseOkV1,
    ClientStateNotFoundResponse,
    VersionNotSupportedResponse,
  );
  export type PullResponseV1 = typeof PullResponseV1.Type;

  export const PullResponse = Schema.Union(PullResponseV0, PullResponseV1);
  export type PullResponse = typeof PullResponse.Type;
}
