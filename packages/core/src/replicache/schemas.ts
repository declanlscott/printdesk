import {
  bigint,
  index,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import * as Schema from "effect/Schema";

import { Columns } from "../columns";
import { Tables } from "../tables";
import {
  ReplicacheClientGroupsModel,
  ReplicacheClientsModel,
  ReplicacheClientViewEntriesModel,
  ReplicacheClientViewsModel,
  ReplicacheMetaModel,
} from "./models";

import type { InferSelectModel } from "drizzle-orm";

export namespace ReplicacheMetaSchema {
  export const table = new Tables.Table(ReplicacheMetaModel.tableName, {
    key: text().primaryKey(),
    value: Columns.jsonb(Schema.Any).notNull(),
  });

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace ReplicacheClientGroupsSchema {
  export const table = new Tables.Table(
    ReplicacheClientGroupsModel.tableName,
    {
      id: uuid("id").notNull(),
      tenantId: Columns.tenantId,
      userId: Columns.entityId.notNull(),
      clientVersion: Columns.version.notNull(),
      clientViewVersion: Columns.version, // null until first pull initializes it
      ...Columns.timestamps,
    },
    (table) => [
      primaryKey({ columns: [table.id, table.tenantId] }),
      index().on(table.updatedAt),
    ],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace ReplicacheClientsSchema {
  export const table = new Tables.Table(
    ReplicacheClientsModel.tableName,
    {
      id: uuid().notNull(),
      tenantId: Columns.tenantId,
      clientGroupId: uuid().notNull(),
      lastMutationId: bigint({ mode: "number" }).notNull().default(0),
      version: Columns.version.notNull(),
      ...Columns.timestamps,
    },
    (table) => [
      primaryKey({ columns: [table.id, table.tenantId] }),
      index().on(table.clientGroupId),
      index().on(table.updatedAt),
    ],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace ReplicacheClientViewsSchema {
  export const table = new Tables.Table(
    ReplicacheClientViewsModel.tableName,
    {
      clientGroupId: uuid().notNull(),
      version: Columns.version.notNull(),
      clientVersion: Columns.version.notNull(),
      tenantId: Columns.tenantId,
    },
    (table) => [
      primaryKey({
        columns: [table.clientGroupId, table.version, table.tenantId],
      }),
    ],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace ReplicacheClientViewEntriesSchema {
  export const table = new Tables.Table(
    ReplicacheClientViewEntriesModel.tableName,
    {
      clientGroupId: uuid().notNull(),
      clientViewVersion: Columns.version.notNull(),
      entity: Columns.union(
        ReplicacheClientViewEntriesModel.entities,
      ).notNull(),
      entityId: Columns.entityId.notNull(),
      entityVersion: Columns.version,
      tenantId: Columns.tenantId,
    },
    (table) => [
      primaryKey({
        columns: [
          table.clientGroupId,
          table.entity,
          table.entityId,
          table.tenantId,
        ],
      }),
      uniqueIndex().on(
        table.clientGroupId,
        table.clientViewVersion,
        table.entity,
        table.entityId,
        table.entityVersion,
        table.tenantId,
      ),
    ],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}
