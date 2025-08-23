import { Array, Data, DateTime, Schema } from "effect";

import { NanoId } from "../utils2";

import type {
  InferSelectModel,
  InferSelectViewModel,
  Table,
  View as View_,
} from "drizzle-orm";
import type { PgTable, PgView } from "drizzle-orm/pg-core";
import type { AccessControl } from "../access-control2";

export namespace TableContract {
  export class Timestamps extends Schema.Class<Timestamps>("Timestamps")({
    createdAt: Schema.optionalWith(Schema.DateTimeUtc, {
      default: DateTime.unsafeNow,
    }),
    updatedAt: Schema.optionalWith(Schema.DateTimeUtc, {
      default: DateTime.unsafeNow,
    }),
    deletedAt: Schema.optionalWith(Schema.NullOr(Schema.DateTimeUtc), {
      default: () => null,
    }),
  }) {}

  export const EntityId = NanoId.pipe(Schema.brand("EntityId"));
  export type EntityId = typeof EntityId.Type;
  export const TenantId = EntityId.pipe(Schema.brand("TenantId"));
  export type TenantId = typeof TenantId.Type;
  export const Version = Schema.Int.pipe(
    Schema.positive(),
    Schema.brand("Version"),
  );
  export type Version = typeof Version.Type;

  export class Tenant extends Schema.Class<Tenant>("TenantTable")({
    id: EntityId,
    tenantId: TenantId,
    ...Timestamps.fields,
  }) {}

  export type Infer<TTable extends Table> = Readonly<
    Omit<InferSelectModel<TTable>, "version">
  >;

  export type InferFromView<TView extends View_> = Readonly<
    Omit<InferSelectViewModel<TView>, "version">
  >;

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
    TSchema extends Schema.Schema.AnyNoContext,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  > {
    readonly name: TTable["_"]["name"];
    readonly Schema: TSchema;
    readonly permissions: Array<InferPermissions<TTable, TActions>>;
  }

  export interface Sync<
    TTable extends PgTable,
    TSchema extends Schema.Schema.AnyNoContext,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  > extends Base<TTable, TSchema, TActions> {
    readonly _tag: "@printdesk/core/database/SyncTable";
  }
  export const Sync =
    <TTable extends PgTable = never>() =>
    <
      TSchema extends Schema.Schema.AnyNoContext,
      TActions extends ReadonlyArray<AccessControl.PermissionAction>,
    >(
      name: TTable["_"]["name"],
      Schema: Schema.Schema.Type<TSchema> extends Infer<TTable>
        ? TSchema
        : never,
      actions: TActions,
    ) =>
      Data.tagged<Sync<TTable, TSchema, TActions>>(
        "@printdesk/core/database/SyncTable",
      )({
        name,
        Schema,
        permissions: Array.map(
          actions,
          (action) => `${name}:${action}` as InferPermissions<TTable, TActions>,
        ),
      });

  export interface NonSync<
    TSchema extends Schema.Schema.AnyNoContext,
    TTable extends PgTable,
    TActions extends ReadonlyArray<AccessControl.PermissionAction>,
  > extends Base<TTable, TSchema, TActions> {
    readonly _tag: "@printdesk/core/database/NonSyncTable";
  }
  export const NonSync =
    <TTable extends PgTable = never>() =>
    <
      TSchema extends Schema.Schema.AnyNoContext,
      TActions extends ReadonlyArray<AccessControl.PermissionAction>,
    >(
      name: TTable["_"]["name"],
      Schema: Schema.Schema.Type<TSchema> extends Infer<TTable>
        ? TSchema
        : never,
      actions: TActions,
    ) =>
      Data.tagged<NonSync<TSchema, TTable, TActions>>(
        "@printdesk/core/database/NonSyncTable",
      )({
        name,
        Schema,
        permissions: Array.map(
          actions,
          (action) => `${name}:${action}` as InferPermissions<TTable, TActions>,
        ),
      });

  export interface View<
    TView extends PgView,
    TSchema extends Schema.Schema.AnyNoContext,
  > {
    readonly _tag: "@printdesk/core/database/View";
    readonly name: TView["_"]["name"];
    readonly Schema: TSchema;
    readonly permission: `${TView["_"]["name"]}:read`;
  }
  export const View =
    <TView extends PgView = never>() =>
    <TSchema extends Schema.Schema.AnyNoContext>(
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

  export interface VirtualView<
    TName extends string,
    TSchema extends Schema.Schema.AnyNoContext,
  > {
    readonly _tag: "@printdesk/core/database/VirtualView";
    readonly name: TName;
    readonly Schema: TSchema;
    readonly permission: `${TName}:read`;
  }
  export const VirtualView =
    <TView extends PgView = never>() =>
    <TName extends string, TSchema extends Schema.Schema.AnyNoContext>(
      name: TName,
      Schema: Schema.Schema.Type<TSchema> extends InferFromView<TView>
        ? TSchema
        : never,
    ) =>
      Data.tagged<VirtualView<TName, TSchema>>(
        "@printdesk/core/database/VirtualView",
      )({
        name,
        Schema,
        permission: `${name}:read` as const,
      });
}
