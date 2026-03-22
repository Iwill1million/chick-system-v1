import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  commercialRegNo: text("commercial_reg_no").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  twilioAccountSid: text("twilio_account_sid").notNull().default(""),
  twilioAuthToken: text("twilio_auth_token").notNull().default(""),
  twilioWhatsappFrom: text("twilio_whatsapp_from").notNull().default(""),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
