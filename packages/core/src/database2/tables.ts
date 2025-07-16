import * as schema from "./schema";

export const syncTables = Object.values(schema)
  .filter((table) => table._tag === "@printdesk/core/database/SyncTable")
  .map(({ table }) => table);
export type SyncTable = (typeof syncTables)[number];
export type SyncTableName = SyncTable["_"]["name"];
export type SyncTableByName<TTableName extends SyncTableName> = Extract<
  SyncTable,
  { _: { name: TTableName } }
>;

export const nonSyncTables = Object.values(schema)
  .filter((table) => table._tag === "@printdesk/core/database/NonSyncTable")
  .map(({ table }) => table);
export type NonSyncTable = (typeof nonSyncTables)[number];
export type NonSyncTableName = NonSyncTable["_"]["name"];
export type NonSyncTableByName<TTableName extends NonSyncTableName> = Extract<
  NonSyncTable,
  { _: { name: TTableName } }
>;

export const tables = [...syncTables, ...nonSyncTables] as const;
export type Table = (typeof tables)[number];
export type TableName = Table["_"]["name"];
export type TableByName<TTableName extends TableName> = Extract<
  Table,
  { _: { name: TTableName } }
>;
