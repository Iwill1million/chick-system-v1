import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { companySettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const SINGLETON_ID = 1;

const DEFAULT_SETTINGS = {
  id: SINGLETON_ID,
  name: "",
  address: "",
  phone: "",
  commercialRegNo: "",
  logoUrl: "",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioWhatsappFrom: "",
};

async function ensureSettings() {
  await db
    .insert(companySettingsTable)
    .values(DEFAULT_SETTINGS)
    .onConflictDoNothing({ target: companySettingsTable.id });

  const rows = await db
    .select()
    .from(companySettingsTable)
    .where(eq(companySettingsTable.id, SINGLETON_ID))
    .limit(1);

  return rows[0] ?? { ...DEFAULT_SETTINGS };
}

function pickPublicFields(row: typeof DEFAULT_SETTINGS) {
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    commercialRegNo: row.commercialRegNo,
    logoUrl: row.logoUrl,
  };
}

function pickAdminFields(row: typeof DEFAULT_SETTINGS) {
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    commercialRegNo: row.commercialRegNo,
    logoUrl: row.logoUrl,
    twilioAccountSid: row.twilioAccountSid ? "***configured***" : "",
    twilioAuthToken: row.twilioAuthToken ? "***configured***" : "",
    twilioWhatsappFrom: row.twilioWhatsappFrom,
    twilioConfigured: !!(row.twilioAccountSid && row.twilioAuthToken && row.twilioWhatsappFrom),
  };
}

router.get("/settings", async (_req: Request, res: Response) => {
  const settings = await ensureSettings();
  res.json(pickPublicFields(settings));
});

router.get("/settings/admin", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  const settings = await ensureSettings();
  res.json(pickAdminFields(settings));
});

router.put(
  "/settings",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { name, address, phone, commercialRegNo, logoUrl, twilioAccountSid, twilioAuthToken, twilioWhatsappFrom } = req.body ?? {};

    await ensureSettings();

    const updates: Partial<typeof DEFAULT_SETTINGS> = {};
    if (typeof name === "string") updates.name = name.trim();
    if (typeof address === "string") updates.address = address.trim();
    if (typeof phone === "string") updates.phone = phone.trim();
    if (typeof commercialRegNo === "string") updates.commercialRegNo = commercialRegNo.trim();
    if (typeof logoUrl === "string") updates.logoUrl = logoUrl.trim();
    if (typeof twilioAccountSid === "string") updates.twilioAccountSid = twilioAccountSid.trim();
    if (typeof twilioAuthToken === "string" && twilioAuthToken !== "***configured***") {
      updates.twilioAuthToken = twilioAuthToken.trim();
    }
    if (typeof twilioWhatsappFrom === "string") updates.twilioWhatsappFrom = twilioWhatsappFrom.trim();

    const updated = await db
      .update(companySettingsTable)
      .set(updates)
      .where(eq(companySettingsTable.id, SINGLETON_ID))
      .returning();

    const result = updated[0];
    if (!result) {
      res.status(500).json({ error: "فشل تحديث الإعدادات" });
      return;
    }
    res.json(pickAdminFields(result));
  }
);

export default router;
