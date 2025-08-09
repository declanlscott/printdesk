import { Array } from "effect";

import { models } from "./models";

export const syncTables = Array.filter(
  models,
  (model) => model._tag === "@printdesk/core/database/SyncTable",
);
export type SyncTable = (typeof syncTables)[number];
export type SyncTableName = SyncTable["name"];
export type SyncTableByName<TName extends SyncTableName> = Extract<
  SyncTable,
  { name: TName }
>;

export const nonSyncTables = Array.filter(
  models,
  (model) => model._tag === "@printdesk/core/database/NonSyncTable",
);
export type NonSyncTable = (typeof nonSyncTables)[number];
export type NonSyncTableName = NonSyncTable["name"];
export type NonSyncTableByName<TName extends NonSyncTableName> = Extract<
  NonSyncTable,
  { name: TName }
>;
