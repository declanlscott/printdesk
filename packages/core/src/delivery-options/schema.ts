import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { numeric, pgView } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { RoomsSchema } from "../rooms/schema";
import { Tables } from "../tables";
import { DeliveryOptionsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace DeliveryOptionsSchema {
  export const table = new Tables.Sync(DeliveryOptionsContract.tableName, {
    name: Columns.varchar().notNull(),
    description: Columns.varchar().notNull(),
    detailsLabel: Columns.varchar(),
    cost: numeric(),
    roomId: Columns.entityId.notNull(),
  });
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(DeliveryOptionsContract.activeViewName).as(
    (qb) =>
      qb
        .select()
        .from(table.definition)
        .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedRoomView = pgView(
    DeliveryOptionsContract.activePublishedRoomViewName,
  ).as((qb) =>
    qb
      .select(getViewSelectedFields(activeView))
      .from(activeView)
      .innerJoin(
        RoomsSchema.activePublishedView,
        and(
          eq(activeView.roomId, RoomsSchema.activePublishedView.id),
          eq(activeView.tenantId, RoomsSchema.activePublishedView.tenantId),
        ),
      ),
  );
  export type ActivePublishedRoomView = typeof activePublishedRoomView;
  export type ActivePublishedRoomRow =
    InferSelectViewModel<ActivePublishedRoomView>;
}
