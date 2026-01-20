import * as Array from "effect/Array";

import type {
  InferSelectModel,
  InferSelectViewModel,
  Table,
  View,
} from "drizzle-orm";
import type { PgTable, PgView } from "drizzle-orm/pg-core";
import type * as Schema from "effect/Schema";
import type { Permissions } from "../permissions";

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
    [TKey in keyof TActions]: TActions[TKey] extends Permissions.Action
      ? `${TTable["_"]["name"]}:${TActions[TKey]}`
      : never;
  }[number];

  export const Table =
    <TTable extends PgTable = never>(name: TTable["_"]["name"]) =>
    <
      TDataTransferObject extends Schema.Schema.AnyNoContext,
      TActions extends ReadonlyArray<Permissions.Action>,
    >(
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TTable>
        ? TDataTransferObject
        : never,
      actions: TActions,
    ) =>
      class {
        static readonly name = name;
        static readonly DataTransferObject = DataTransferObject;

        static get permissions() {
          return Array.map(
            actions,
            (action) =>
              `${name}:${action}` as InferPermissions<TTable, TActions>,
          );
        }
      };

  export const View =
    <TView extends PgView>(name: TView["_"]["name"]) =>
    <TDataTransferObject extends Schema.Schema.AnyNoContext>(
      DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TView>
        ? TDataTransferObject
        : never,
    ) =>
      class {
        static readonly name = name;
        static readonly DataTransferObject = DataTransferObject;

        static get permission() {
          return `${name}:read` as const;
        }
      };

  export const VirtualView =
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
      class {
        static readonly name = name;
        static readonly DataTransferObject = DataTransferObject;

        static get permission() {
          return `${name}:read` as const;
        }
      };

  export const InternalTable =
    <TTable extends PgTable>(name: TTable["_"]["name"]) =>
    <TRecord extends Schema.Schema.AnyNoContext>(
      Record: Schema.Schema.Type<TRecord> extends InferSelectModel<TTable>
        ? TRecord
        : never,
    ) =>
      class {
        static readonly name = name;
        static readonly Record = Record;
      };
}
