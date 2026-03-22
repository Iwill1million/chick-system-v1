import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  commercialRegNo: text("commercial_reg_no").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
