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
import { ReplicacheClientViewEntriesModel } from "./models";

import type { InferSelectModel } from "drizzle-orm";
import type { ReplicacheClientGroupsModel } from "./models";

const clientGroupId = uuid().$type<ReplicacheClientGroupsModel.Id>();

export namespace ReplicacheMetaSchema {
  export const table = new Tables.Table("replicache_meta", {
    key: text().primaryKey(),
    value: Columns.jsonb(Schema.Any).notNull(),
  });

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace ReplicacheClientGroupsSchema {
  export const table = new Tables.Table(
    "replicache_client_groups",
    {
      id: clientGroupId.notNull(),
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
    "replicache_clients",
    {
      id: uuid().notNull(),
      tenantId: Columns.tenantId,
      clientGroupId: clientGroupId.notNull(),
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
    "replicache_client_views",
    {
      clientGroupId: clientGroupId.notNull(),
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
    "replicache_client_view_entries",
    {
      clientGroupId: clientGroupId.notNull(),
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
