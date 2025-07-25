import * as schema from "./schema";

export const syncTables = Object.values(schema).filter(
  (data) => data._tag === "@printdesk/core/database/SyncTable",
);
export type SyncTable = (typeof syncTables)[number];
export type SyncTableName = SyncTable["name"];
export type SyncTableByName<TName extends SyncTableName> = Extract<
  SyncTable,
  { name: TName }
>;

export const nonSyncTables = Object.values(schema).filter(
  (data) => data._tag === "@printdesk/core/database/NonSyncTable",
);
export type NonSyncTable = (typeof nonSyncTables)[number];
export type NonSyncTableName = NonSyncTable["name"];
export type NonSyncTableByName<TName extends NonSyncTableName> = Extract<
  NonSyncTable,
  { name: TName }
>;

export const views = Object.values(schema).filter(
  (data) => data._tag === "@printdesk/core/database/View",
);
export type View = (typeof views)[number];
export type ViewName = View["name"];
export type ViewByName<TName extends ViewName> = Extract<View, { name: TName }>;
