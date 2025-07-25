import { Array, Data, Schema } from "effect";

import { NanoId } from "../utils2/shared";

import type {
  InferSelectModel,
  InferSelectViewModel,
  Table,
  View as View_,
} from "drizzle-orm";
import type { PgTable, PgView } from "drizzle-orm/pg-core";
import type { AccessControl } from "../access-control2";

export const Timestamps = Schema.Struct({
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  deletedAt: Schema.NullOr(Schema.Date),
});

export const TenantTable = Schema.Struct({
  id: NanoId,
  tenantId: NanoId,
  ...Timestamps.fields,
});

export type InferFromTable<TTable extends Table> = Readonly<
  Omit<InferSelectModel<TTable>, "version">
>;

export type InferFromView<TView extends View_> = Readonly<
  Omit<InferSelectViewModel<TView>, "version">
>;

export type InferTablePermissions<
  TTable extends PgTable,
  TActions extends ReadonlyArray<AccessControl.PermissionAction>,
> = {
  [TIndex in keyof TActions]: TActions[TIndex] extends AccessControl.PermissionAction
    ? `${TTable["_"]["name"]}:${TActions[TIndex]}`
    : never;
}[number];

interface BaseTable<
  TTable extends PgTable,
  TSchema extends Schema.Schema.Any,
  TActions extends ReadonlyArray<AccessControl.PermissionAction>,
> {
  readonly name: TTable["_"]["name"];
  readonly Schema: TSchema;
  readonly permissions: Array<InferTablePermissions<TTable, TActions>>;
}

export interface SyncTable<
  TTable extends PgTable,
  TSchema extends Schema.Schema.Any,
  TActions extends ReadonlyArray<AccessControl.PermissionAction>,
> extends BaseTable<TTable, TSchema, TActions> {
  readonly _tag: "@printdesk/core/database/SyncTable";
}
export const SyncTable =
  <TTable extends PgTable = never>() =>
  <
    TSchema extends Schema.Schema.Any,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  >(
    name: TTable["_"]["name"],
    Schema: Schema.Schema.Type<TSchema> extends InferFromTable<TTable>
      ? TSchema
      : never,
    actions: TActions,
  ) =>
    Data.tagged<SyncTable<TTable, TSchema, TActions>>(
      "@printdesk/core/database/SyncTable",
    )({
      name,
      Schema,
      permissions: Array.map(
        actions,
        (action) =>
          `${name}:${action}` as InferTablePermissions<TTable, TActions>,
      ),
    });

export interface NonSyncTable<
  TSchema extends Schema.Schema.Any,
  TTable extends PgTable,
  TActions extends ReadonlyArray<AccessControl.PermissionAction>,
> extends BaseTable<TTable, TSchema, TActions> {
  readonly _tag: "@printdesk/core/database/NonSyncTable";
}
export const NonSyncTable =
  <TTable extends PgTable = never>() =>
  <
    TSchema extends Schema.Schema.Any,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  >(
    name: TTable["_"]["name"],
    Schema: Schema.Schema.Type<TSchema> extends InferFromTable<TTable>
      ? TSchema
      : never,
    actions: TActions,
  ) =>
    Data.tagged<NonSyncTable<TSchema, TTable, TActions>>(
      "@printdesk/core/database/NonSyncTable",
    )({
      name,
      Schema,
      permissions: Array.map(
        actions,
        (action) =>
          `${name}:${action}` as InferTablePermissions<TTable, TActions>,
      ),
    });

export interface View<TView extends PgView, TSchema extends Schema.Schema.Any> {
  readonly _tag: "@printdesk/core/database/View";
  readonly name: TView["_"]["name"];
  readonly Schema: TSchema;
  readonly permission: `${TView["_"]["name"]}:read`;
}
export const View =
  <TView extends PgView = never>() =>
  <TSchema extends Schema.Schema.Any>(
    name: TView["_"]["name"],
    Schema: Schema.Schema.Type<TSchema> extends InferFromView<TView>
      ? TSchema
      : never,
  ) =>
    Data.tagged<View<TView, TSchema>>("@printdesk/core/database/View")({
      name,
      Schema,
      permission: `${name}:read` as const,
    });
