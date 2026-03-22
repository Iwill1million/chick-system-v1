import { pgTable, serial, integer, numeric, date, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { usersTable } from "./users";

export const customerPaymentsTable = pgTable("customer_payments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("customer_payments_customer_id_idx").on(t.customerId),
]);

export const insertCustomerPaymentSchema = createInsertSchema(customerPaymentsTable).omit({ id: true, createdAt: true });

export type InsertCustomerPayment = z.infer<typeof insertCustomerPaymentSchema>;
export type CustomerPayment = typeof customerPaymentsTable.$inferSelect;
