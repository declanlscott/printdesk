import { Array, Data, DateTime, Schema } from "effect";

import { Constants } from "../utils/constants";
import { generateId } from "../utils/shared";
import { NanoId } from "../utils2";

import type {
  Table as DrizzleTable,
  View as DrizzleView,
  InferSelectModel,
  InferSelectViewModel,
} from "drizzle-orm";
import type { PgTable, PgView } from "drizzle-orm/pg-core";
import type { AccessControl } from "../access-control2";

export namespace TableContract {
  export const VarChar = Schema.Trim.pipe(
    Schema.maxLength(Constants.VARCHAR_LENGTH),
  );
  export type VarChar = typeof VarChar.Type;

  export class Timestamps extends Schema.Class<Timestamps>("Timestamps")({
    createdAt: Schema.DateTimeUtc.pipe(
      Schema.optionalWith({ default: DateTime.unsafeNow }),
    ),
    updatedAt: Schema.DateTimeUtc.pipe(
      Schema.optionalWith({ default: DateTime.unsafeNow }),
    ),
    deletedAt: Schema.DateTimeUtc.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
  }) {}

  export const EntityId = NanoId.pipe(Schema.brand("EntityId"));
  export type EntityId = typeof EntityId.Type;
  export const TenantId = EntityId.pipe(Schema.brand("TenantId"));
  export type TenantId = typeof TenantId.Type;

  export class TenantColumns extends Schema.Class<TenantColumns>(
    "TenantColumns",
  )({
    id: EntityId.pipe(Schema.optionalWith({ default: generateId })),
    tenantId: TenantId,
  }) {}

  export class Tenant extends Schema.Class<Tenant>("TenantTable")({
    ...TenantColumns.fields,
    ...Timestamps.fields,
  }) {}

  export const Version = Schema.NonNegativeInt.pipe(Schema.brand("Version"));
  export type Version = typeof Version.Type;

  export type InferDataTransferObject<
    TModel extends DrizzleTable | DrizzleView,
  > = TModel extends DrizzleTable
    ? Readonly<Omit<InferSelectModel<TModel>, "version">>
    : TModel extends DrizzleView
      ? Readonly<Omit<InferSelectViewModel<TModel>, "version">>
      : never;

  export type InferPermissions<
    TTable extends PgTable,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  > = {
    [TIndex in keyof TActions]: TActions[TIndex] extends AccessControl.PermissionAction
      ? `${TTable["_"]["name"]}:${TActions[TIndex]}`
      : never;
  }[number];

  interface Base<
    TTable extends PgTable,
    TDataTransferObject extends Schema.Schema.AnyNoContext,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  > {
    readonly name: TTable["_"]["name"];
    readonly DataTransferObject: TDataTransferObject;
    readonly permissions: Array<InferPermissions<TTable, TActions>>;
  }

  export interface Sync<
    TTable extends PgTable,
    TDataTransferObject extends Schema.Schema.AnyNoContext,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  > extends Base<TTable, TDataTransferObject, TActions> {
    readonly _tag: "@printdesk/core/database/SyncTable";
  }
  export const Sync =
    <TTable extends PgTable = never>() =>
    <
      TDataTransferObject extends Schema.Schema.AnyNoContext,
      TActions extends ReadonlyArray<AccessControl.PermissionAction>,
    >(
      name: TTable["_"]["name"],
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TTable>
        ? TDataTransferObject
        : never,
      actions: TActions,
    ) =>
      Data.tagged<Sync<TTable, TDataTransferObject, TActions>>(
        "@printdesk/core/database/SyncTable",
      )({
        name,
        DataTransferObject,
        permissions: Array.map(
          actions,
          (action) => `${name}:${action}` as InferPermissions<TTable, TActions>,
        ),
      });

  export interface NonSync<
    TTable extends PgTable,
    TDataTransferObject extends Schema.Schema.AnyNoContext,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  > extends Base<TTable, TDataTransferObject, TActions> {
    readonly _tag: "@printdesk/core/database/NonSyncTable";
  }
  export const NonSync =
    <TTable extends PgTable = never>() =>
    <
      TDataTransferObject extends Schema.Schema.AnyNoContext,
      TActions extends ReadonlyArray<AccessControl.PermissionAction>,
    >(
      name: TTable["_"]["name"],
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TTable>
        ? TDataTransferObject
        : never,
      actions: TActions,
    ) =>
      Data.tagged<NonSync<TTable, TDataTransferObject, TActions>>(
        "@printdesk/core/database/NonSyncTable",
      )({
        name,
        DataTransferObject,
        permissions: Array.map(
          actions,
          (action) => `${name}:${action}` as InferPermissions<TTable, TActions>,
        ),
      });

  export interface View<
    TView extends PgView,
    TDataTransferObject extends Schema.Schema.AnyNoContext,
  > {
    readonly _tag: "@printdesk/core/database/View";
    readonly name: TView["_"]["name"];
    readonly DataTransferObject: TDataTransferObject;
    readonly permission: `${TView["_"]["name"]}:read`;
  }
  export const View =
    <TView extends PgView = never>() =>
    <TDataTransferObject extends Schema.Schema.AnyNoContext>(
      name: TView["_"]["name"],
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TView>
        ? TDataTransferObject
        : never,
    ) =>
      Data.tagged<View<TView, TDataTransferObject>>(
        "@printdesk/core/database/View",
      )({
        name,
        DataTransferObject,
        permission: `${name}:read` as const,
      });

  export interface VirtualView<
    TName extends string,
    TDataTransferObject extends Schema.Schema.AnyNoContext,
  > {
    readonly _tag: "@printdesk/core/database/VirtualView";
    readonly name: TName;
    readonly DataTransferObject: TDataTransferObject;
    readonly permission: `${TName}:read`;
  }
  export const VirtualView =
    <TView extends PgView = never>() =>
    <
      TName extends string,
      TDataTransferObject extends Schema.Schema.AnyNoContext,
    >(
      name: TName,
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TView>
        ? TDataTransferObject
        : never,
    ) =>
      Data.tagged<VirtualView<TName, TDataTransferObject>>(
        "@printdesk/core/database/VirtualView",
      )({
        name,
        DataTransferObject,
        permission: `${name}:read` as const,
      });

  export interface Internal<
    TTable extends PgTable,
    TRow extends Schema.Schema.AnyNoContext,
  > {
    readonly _tag: "@printdesk/core/database/InternalTable";
    readonly name: TTable["_"]["name"];
    readonly Row: TRow;
  }
  export const Internal =
    <TTable extends PgTable>() =>
    <TName extends string, TRow extends Schema.Schema.AnyNoContext>(
      name: TName,
      Row: Schema.Schema.Type<TRow> extends InferSelectModel<TTable>
        ? TRow
        : never,
    ) =>
      Data.tagged<Internal<TTable, TRow>>(
        "@printdesk/core/database/InternalTable",
      )({ name, Row });
}
