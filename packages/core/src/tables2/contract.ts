import * as Array from "effect/Array";

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
    [TKey in keyof TActions]: TActions[TKey] extends Permissions.Action
      ? `${TTable["_"]["name"]}:${TActions[TKey]}`
      : never;
  }[number];

  export const makeClass = <TTable extends PgTable>() =>
    class<
      TDataTransferObject extends Schema.Schema.AnyNoContext,
      TActions extends ReadonlyArray<Permissions.Action>,
    > {
      readonly name: TTable["_"]["name"];
      readonly DataTransferObject: TDataTransferObject;
      readonly #actions: TActions;

      constructor(
        name: TTable["_"]["name"],
        DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TTable>
          ? TDataTransferObject
          : never,
        actions: TActions,
      ) {
        this.name = name;
        this.DataTransferObject = DataTransferObject;
        this.#actions = actions;
      }

      get permissions() {
        return Array.map(
          this.#actions,
          (action) =>
            `${this.name}:${action}` as InferPermissions<TTable, TActions>,
        );
      }
    };

  export const makeViewClass = <TView extends PgView>() =>
    class<TDataTransferObject extends Schema.Schema.AnyNoContext> {
      readonly name: TView["_"]["name"];
      readonly DataTransferObject: TDataTransferObject;

      constructor(
        name: TView["_"]["name"],
        DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TView>
          ? TDataTransferObject
          : never,
      ) {
        this.name = name;
        this.DataTransferObject = DataTransferObject;
      }

      get permission() {
        return `${this.name}:read` as const;
      }
    };

  export const makeVirtualViewClass = <TView extends PgView>() =>
    class<
      TName extends string,
      TDataTransferObject extends Schema.Schema.AnyNoContext,
    > {
      readonly name: TName;
      readonly DataTransferObject: TDataTransferObject;

      constructor(
        name: TName,
        DataTransferObject: Schema.Schema.Type<TDataTransferObject> extends InferDataTransferObject<TView>
          ? TDataTransferObject
          : never,
      ) {
        this.name = name;
        this.DataTransferObject = DataTransferObject;
      }

      get permission() {
        return `${this.name}:read` as const;
      }
    };

  export const makeInternalClass = <TTable extends PgTable>() =>
    class<TRow extends Schema.Schema.AnyNoContext> {
      readonly name: TTable["_"]["name"];
      readonly Record: TRow;

      constructor(
        name: TTable["_"]["name"],
        Record: Schema.Schema.Type<TRow> extends InferSelectModel<TTable>
          ? TRow
          : never,
      ) {
        this.name = name;
        this.Record = Record;
      }
    };
}
