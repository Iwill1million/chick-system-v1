import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { CreateCustomerBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    location: c.location,
    openingBalance: c.openingBalance,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/customers", authenticateToken, async (_req: Request, res: Response) => {
  const customers = await db.select().from(customersTable);
  res.json(customers.map(formatCustomer));
});

router.post("/customers", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const body = CreateCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات غير صحيحة" });
    return;
  }

  const inserted = await db.insert(customersTable).values({
    name: body.data.name,
    phone: body.data.phone ?? null,
    location: body.data.location ?? null,
    openingBalance: body.data.openingBalance ?? "0",
    notes: body.data.notes ?? null,
  }).returning();

  res.status(201).json(formatCustomer(inserted[0]));
});

router.get("/customers/:id", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (!id || isNaN(id)) { res.status(400).json({ message: "معرف غير صالح" }); return; }
  const customers = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customers[0]) {
    res.status(404).json({ message: "العميل غير موجود" });
    return;
  }
  res.json(formatCustomer(customers[0]));
});

router.put("/customers/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (!id || isNaN(id)) { res.status(400).json({ message: "معرف غير صالح" }); return; }
  const body = CreateCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات غير صحيحة" });
    return;
  }

  const updated = await db.update(customersTable).set({
    name: body.data.name,
    phone: body.data.phone ?? null,
    location: body.data.location ?? null,
    openingBalance: body.data.openingBalance ?? "0",
    notes: body.data.notes ?? null,
  }).where(eq(customersTable.id, id)).returning();

  if (!updated[0]) {
    res.status(404).json({ message: "العميل غير موجود" });
    return;
  }

  res.json(formatCustomer(updated[0]));
});

router.delete("/customers/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (!id || isNaN(id)) { res.status(400).json({ message: "معرف غير صالح" }); return; }
  await db.delete(customersTable).where(eq(customersTable.id, id));
  res.status(204).send();
});

export default router;
