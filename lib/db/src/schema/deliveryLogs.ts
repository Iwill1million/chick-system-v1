import { pgTable, serial, integer, numeric, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const paymentMethodEnum = pgEnum("payment_method", ["cash", "transfer", "wallet"]);
export const expenseCategoryEnum = pgEnum("expense_category", ["fuel", "food", "collection_fee", "other"]);

export const deliveryLogsTable = pgTable("delivery_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  agentId: integer("agent_id").notNull().references(() => usersTable.id),
  collectedAmount: numeric("collected_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveredQuantity: integer("delivered_quantity").notNull().default(0),
  fuelExpense: numeric("fuel_expense", { precision: 12, scale: 2 }).notNull().default("0"),
  otherExpenses: numeric("other_expenses", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  paymentImageUrl: text("payment_image_url"),
  noCollectionReason: text("no_collection_reason"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});

export const deliveryLogItemsTable = pgTable("delivery_log_items", {
  id: serial("id").primaryKey(),
  deliveryLogId: integer("delivery_log_id").notNull().references(() => deliveryLogsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  orderedQty: integer("ordered_qty").notNull(),
  deliveredQty: integer("delivered_qty").notNull(),
});

export const deliveryLogExpensesTable = pgTable("delivery_log_expenses", {
  id: serial("id").primaryKey(),
  deliveryLogId: integer("delivery_log_id").notNull().references(() => deliveryLogsTable.id, { onDelete: "cascade" }),
  category: expenseCategoryEnum("category").notNull().default("other"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
});

export const insertDeliveryLogSchema = createInsertSchema(deliveryLogsTable).omit({ id: true, loggedAt: true });
export const insertDeliveryLogItemSchema = createInsertSchema(deliveryLogItemsTable).omit({ id: true });
export const insertDeliveryLogExpenseSchema = createInsertSchema(deliveryLogExpensesTable).omit({ id: true });

export type InsertDeliveryLog = z.infer<typeof insertDeliveryLogSchema>;
export type InsertDeliveryLogItem = z.infer<typeof insertDeliveryLogItemSchema>;
export type InsertDeliveryLogExpense = z.infer<typeof insertDeliveryLogExpenseSchema>;
export type DeliveryLog = typeof deliveryLogsTable.$inferSelect;
export type DeliveryLogItem = typeof deliveryLogItemsTable.$inferSelect;
export type DeliveryLogExpense = typeof deliveryLogExpensesTable.$inferSelect;
