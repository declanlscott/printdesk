import { text, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { ClientsContract } from "./contract";

import type { InferSelectModel } from "drizzle-orm";
import type { CallbackId } from "../utils";

export const clients = new Tables.NonSync(
  "clients",
  {
    name: Columns.varchar().notNull(),
    secretHash: Columns.hash().notNull(),
    role: Columns.union(ClientsContract.Role.literals).notNull(),
    scopes: Columns.stringArray().notNull(),
    callbackId: text().$type<CallbackId>(),
    identityProviderId: Columns.entityId(),
  },
  (table) => [uniqueIndex().on(table.id)],
);
export const clientsTable = clients.table;
export type ClientsTable = typeof clientsTable;
export type Client = InferSelectModel<ClientsTable>;
