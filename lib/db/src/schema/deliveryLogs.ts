import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { usersTable } from "./users";

export const deliveryLogsTable = pgTable("delivery_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  agentId: integer("agent_id").notNull().references(() => usersTable.id),
  collectedAmount: numeric("collected_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveredQuantity: integer("delivered_quantity").notNull().default(0),
  fuelExpense: numeric("fuel_expense", { precision: 12, scale: 2 }).notNull().default("0"),
  otherExpenses: numeric("other_expenses", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});

export const insertDeliveryLogSchema = createInsertSchema(deliveryLogsTable).omit({ id: true, loggedAt: true });

export type InsertDeliveryLog = z.infer<typeof insertDeliveryLogSchema>;
export type DeliveryLog = typeof deliveryLogsTable.$inferSelect;
