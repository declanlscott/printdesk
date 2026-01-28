import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns/contract";
import { Models } from "../models";
import { Procedures } from "../procedures";
import { Constants } from "../utils/constants";
import { ReplicacheClientGroupsModel } from "./models";

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
}

export namespace ReplicachePullerContract {
  export class Headers extends Schema.Class<Headers>("Headers")({
    "X-Replicache-RequestID": Schema.String,
  }) {}

  export const Cookie = Schema.Struct({ order: ColumnsContract.Version }).pipe(
    Schema.NullOr,
  );

  export class RequestV0 extends Schema.Class<RequestV0>("RequestV0")({
    pullVersion: Schema.tag(0),
    schemaVersion: Schema.String,
    profileId: Schema.String.pipe(
      Schema.propertySignature,
      Schema.fromKey("profileID"),
    ),
    cookie: Cookie,
    clientId: Schema.UUID.pipe(
      Schema.propertySignature,
      Schema.fromKey("clientID"),
    ),
    lastMutationId: Schema.Int.pipe(
      Schema.propertySignature,
      Schema.fromKey("lastMutationID"),
    ),
  }) {}

  export class RequestV1 extends Schema.Class<RequestV1>("RequestV1")({
    pullVersion: Schema.tag(1),
    schemaVersion: Schema.String,
    profileId: Schema.String.pipe(
      Schema.propertySignature,
      Schema.fromKey("profileID"),
    ),
    cookie: Cookie,
    clientGroupId: ReplicacheClientGroupsModel.Id.pipe(
      Schema.propertySignature,
      Schema.fromKey("clientGroupID"),
    ),
  }) {}

  export const Request = Schema.Union(RequestV0, RequestV1);
  export type Request = typeof Request.Type;

  export const isRequestV1 = (request: Request): request is RequestV1 =>
    request.pullVersion === 1;

  export const Payload = Request;
  export type Payload = typeof Payload.Type;

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

  export class ResponseOkV0 extends Schema.Class<ResponseOkV0>("ResponseOkV0")({
    cookie: Cookie,
    lastMutationID: Schema.Int,
    patch: PatchOperation.pipe(Schema.Chunk),
  }) {}

  export const ResponseV0 = Schema.Union(
    ResponseOkV0,
    ReplicacheContract.ClientStateNotFoundResponse,
    ReplicacheContract.VersionNotSupportedResponse,
  );
  export type ResponseV0 = typeof ResponseV0.Type;

  export class ResponseOkV1 extends Schema.Class<ResponseOkV1>("ResponseOkV1")({
    cookie: Cookie,
    lastMutationIdChanges: Schema.Record({
      key: Schema.UUID,
      value: ColumnsContract.Version,
    }).pipe(Schema.propertySignature, Schema.fromKey("lastMutationIDChanges")),
    patch: PatchOperation.pipe(Schema.Chunk),
  }) {}

  export const ResponseV1 = Schema.Union(
    ResponseOkV1,
    ReplicacheContract.ClientStateNotFoundResponse,
    ReplicacheContract.VersionNotSupportedResponse,
  );
  export type ResponseV1 = typeof ResponseV1.Type;

  export const Response = Schema.Union(ResponseV0, ResponseV1);
  export type Response = typeof Response.Type;

  export const Success = Response.pipe(Schema.encodedSchema);
  export type Success = typeof Success.Type;
}

export namespace ReplicachePusherContract {
  export class Headers extends Schema.Class<Headers>("Headers")({
    "X-Replicache-RequestID": Schema.String,
  }) {}

  export const MutationV0 = Procedures.Mutations.ReplicacheV0;
  export type MutationV0 = Effect.Effect.Success<typeof MutationV0>["Type"];

  export const MutationV1 = Procedures.Mutations.ReplicacheV1;
  export type MutationV1 = Effect.Effect.Success<typeof MutationV1>["Type"];

  export const Mutation = Effect.all([MutationV0, MutationV1]).pipe(
    Effect.map((members) => Schema.Union(...members)),
  );
  export type Mutation = Effect.Effect.Success<typeof Mutation>["Type"];

  export class FutureMutationError extends Schema.TaggedError<FutureMutationError>(
    "FutureMutationError",
  )(
    "FutureMutationError",
    { mutationId: Schema.Int },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}

  export const RequestV0 = MutationV0.pipe(
    Effect.map(
      (mutation) =>
        class RequestV0 extends Schema.Class<RequestV0>("RequestV0")({
          pushVersion: Schema.tag(0),
          clientID: Schema.UUID,
          mutations: mutation.pipe(Schema.Array),
          profileID: Schema.String,
          schemaVersion: Schema.String,
        }) {},
    ),
  );
  export type RequestV0 = Effect.Effect.Success<typeof RequestV0>["Type"];

  export const RequestV1 = MutationV1.pipe(
    Effect.map(
      (mutation) =>
        class RequestV1 extends Schema.Class<RequestV1>("RequestV1")({
          pushVersion: Schema.tag(1),
          clientGroupId: ReplicacheClientGroupsModel.Id.pipe(
            Schema.propertySignature,
            Schema.fromKey("clientGroupID"),
          ),
          mutations: mutation.pipe(Schema.Array),
          profileId: Schema.UUID.pipe(
            Schema.propertySignature,
            Schema.fromKey("profileID"),
          ),
          schemaVersion: Schema.String,
        }) {},
    ),
  );
  export type RequestV1 = Effect.Effect.Success<typeof RequestV1>["Type"];

  export const Request = Effect.all([RequestV0, RequestV1]).pipe(
    Effect.map((members) => Schema.Union(...members)),
  );
  export type Request = Effect.Effect.Success<typeof Request>["Type"];

  export const isRequestV1 = (request: Request): request is RequestV1 =>
    request.pushVersion === 1;

  export const Payload = Request;
  export type Payload = Effect.Effect.Success<typeof Payload>["Type"];

  export const Response = Schema.Union(
    ReplicacheContract.ClientStateNotFoundResponse,
    ReplicacheContract.VersionNotSupportedResponse,
  ).pipe(Schema.UndefinedOr);
  export type Response = typeof Response.Type;

  export const Success = Response.pipe(Schema.encodedSchema);
  export type Success = typeof Success.Type;
}
