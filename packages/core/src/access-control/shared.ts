import type { SyncedTableName } from "../utils/tables";

export type Resource =
  | SyncedTableName
  | "documents-mime-types"
  | "documents-size-limit"
  | "papercut-sync"
  | "services"
  | "monthly-active-users";

export type Action = "create" | "read" | "update" | "delete";
