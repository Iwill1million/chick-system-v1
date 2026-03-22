import { pgTable, serial, integer, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { customersTable } from "./customers";

export const whatsappMessageTypeEnum = pgEnum("whatsapp_message_type", [
  "order_confirmation",
  "delivery_notice",
  "customer_statement",
]);

export const whatsappStatusEnum = pgEnum("whatsapp_status", [
  "sent",
  "failed",
]);

export const whatsappLogsTable = pgTable("whatsapp_logs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  messageType: whatsappMessageTypeEnum("message_type").notNull(),
  status: whatsappStatusEnum("status").notNull(),
  toPhone: text("to_phone").notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (t) => [
  index("whatsapp_logs_customer_id_idx").on(t.customerId),
  index("whatsapp_logs_order_id_idx").on(t.orderId),
]);

export type WhatsappLog = typeof whatsappLogsTable.$inferSelect;
