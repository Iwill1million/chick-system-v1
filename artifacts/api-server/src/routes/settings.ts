import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { companySettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(companySettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const inserted = await db.insert(companySettingsTable).values({
    name: "",
    address: "",
    phone: "",
    commercialRegNo: "",
    logoUrl: "",
  }).returning();
  return inserted[0]!;
}

router.get("/settings", async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  res.json({
    name: settings.name,
    address: settings.address,
    phone: settings.phone,
    commercialRegNo: settings.commercialRegNo,
    logoUrl: settings.logoUrl,
  });
});

router.put("/settings", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { name, address, phone, commercialRegNo, logoUrl } = req.body ?? {};

  const existing = await getOrCreateSettings();

  const updated = await db
    .update(companySettingsTable)
    .set({
      name: typeof name === "string" ? name.trim() : existing.name,
      address: typeof address === "string" ? address.trim() : existing.address,
      phone: typeof phone === "string" ? phone.trim() : existing.phone,
      commercialRegNo: typeof commercialRegNo === "string" ? commercialRegNo.trim() : existing.commercialRegNo,
      logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : existing.logoUrl,
    })
    .where(eq(companySettingsTable.id, existing.id))
    .returning();

  const result = updated[0] ?? existing;
  res.json({
    name: result.name,
    address: result.address,
    phone: result.phone,
    commercialRegNo: result.commercialRegNo,
    logoUrl: result.logoUrl,
  });
});

export default router;
