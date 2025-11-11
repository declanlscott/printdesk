import * as Array from "effect/Array";
import * as Effect from "effect/Effect";

import type {
  InferSelectModel,
  InferSelectViewModel,
  Table,
  View,
} from "drizzle-orm";
import type { PgTable, PgView } from "drizzle-orm/pg-core";
import type { Schema } from "effect";
import type { Permissions } from "../permissions2";

export namespace TablesContract {
  export type InferDataTransferObject<TModel extends Table | View> =
    TModel extends Table
      ? Readonly<Omit<InferSelectModel<TModel>, "version">>
      : TModel extends View
        ? Readonly<Omit<InferSelectViewModel<TModel>, "version">>
        : never;

  export type InferPermissions<
    TTable extends PgTable,
    TActions extends ReadonlyArray<Permissions.Action>,
  > = {
    [TIndex in keyof TActions]: TActions[TIndex] extends Permissions.Action
      ? `${TTable["_"]["name"]}:${TActions[TIndex]}`
      : never;
  }[number];

  export const makeTable =
    <TTable extends PgTable>() =>
    <
      TDataTransferObject extends Schema.Schema.AnyNoContext,
      TActions extends ReadonlyArray<Permissions.Action>,
    >(
      name: TTable["_"]["name"],
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TTable>
        ? TDataTransferObject
        : never,
      actions: TActions,
    ) =>
      Object.assign(
        Effect.sync(() => ({
          name,
          DataTransferObject,
          permissions: Array.map(
            actions,
            (action) =>
              `${name}:${action}` as InferPermissions<TTable, TActions>,
          ),
        })),
        { name },
      );

  export const makeView =
    <TView extends PgView>() =>
    <TDataTransferObject extends Schema.Schema.AnyNoContext>(
      name: TView["_"]["name"],
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TView>
        ? TDataTransferObject
        : never,
    ) =>
      Object.assign(
        Effect.sync(() => ({
          name,
          DataTransferObject,
          permission: `${name}:read` as const,
        })),
        { name },
      );

  export const makeVirtualView =
    <TView extends PgView>() =>
    <
      TName extends string,
      TDataTransferObject extends Schema.Schema.AnyNoContext,
    >(
      name: TName,
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TView>
        ? TDataTransferObject
        : never,
    ) =>
      Object.assign(
        Effect.sync(() => ({
          name,
          DataTransferObject,
          permission: `${name}:read` as const,
        })),
        { name },
      );

  export const makeInternalTable =
    <TTable extends PgTable>() =>
    <TRow extends Schema.Schema.AnyNoContext>(
      name: TTable["_"]["name"],
      Record: Schema.Schema.Type<TRow> extends InferSelectModel<TTable>
        ? TRow
        : never,
    ) =>
      Object.assign(
        Effect.sync(() => ({ name, Record })),
        { name },
      );
}
