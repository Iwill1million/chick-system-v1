import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { companySettingsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const SINGLETON_ID = 1;

const DEFAULT_SETTINGS: {
  id: number;
  name: string;
  address: string;
  phone: string;
  commercialRegNo: string;
  logoUrl: string;
} = {
  id: SINGLETON_ID,
  name: "",
  address: "",
  phone: "",
  commercialRegNo: "",
  logoUrl: "",
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

function pickSettingsFields(row: typeof DEFAULT_SETTINGS) {
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    commercialRegNo: row.commercialRegNo,
    logoUrl: row.logoUrl,
  };
}

router.get("/settings", async (_req: Request, res: Response) => {
  const settings = await ensureSettings();
  res.json(pickSettingsFields(settings));
});

router.put(
  "/settings",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { name, address, phone, commercialRegNo, logoUrl } = req.body ?? {};

    await ensureSettings();

    const updated = await db
      .update(companySettingsTable)
      .set({
        ...(typeof name === "string" ? { name: name.trim() } : {}),
        ...(typeof address === "string" ? { address: address.trim() } : {}),
        ...(typeof phone === "string" ? { phone: phone.trim() } : {}),
        ...(typeof commercialRegNo === "string"
          ? { commercialRegNo: commercialRegNo.trim() }
          : {}),
        ...(typeof logoUrl === "string" ? { logoUrl: logoUrl.trim() } : {}),
      })
      .where(eq(companySettingsTable.id, SINGLETON_ID))
      .returning();

    const result = updated[0];
    if (!result) {
      res.status(500).json({ error: "فشل تحديث الإعدادات" });
      return;
    }
    res.json(pickSettingsFields(result));
  }
);

export default router;
