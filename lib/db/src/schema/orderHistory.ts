import { pgTable, serial, integer, timestamp, index, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable, orderStatusEnum } from "./orders";

export const orderHistoryTable = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  changedBy: integer("changed_by").notNull().references(() => usersTable.id),
  oldStatus: orderStatusEnum("old_status").notNull(),
  newStatus: orderStatusEnum("new_status").notNull(),
  notes: text("notes"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
}, (t) => [
  index("order_history_order_id_idx").on(t.orderId),
]);

export const insertOrderHistorySchema = createInsertSchema(orderHistoryTable).omit({ id: true, changedAt: true });

export type InsertOrderHistory = z.infer<typeof insertOrderHistorySchema>;
export type OrderHistory = typeof orderHistoryTable.$inferSelect;
