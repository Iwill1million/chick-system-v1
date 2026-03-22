import { pgTable, serial, text, integer, timestamp, pgEnum, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { customersTable } from "./customers";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  agentId: integer("agent_id").references(() => usersTable.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  orderDate: date("order_date").notNull(),
  deliveryDate: date("delivery_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("orders_agent_id_idx").on(t.agentId),
  index("orders_status_idx").on(t.status),
  index("orders_order_date_idx").on(t.orderDate),
]);

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
