import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, lte } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { CreateProductBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    unitPrice: p.unitPrice,
    stockQuantity: p.stockQuantity,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
  };
}

const LOW_STOCK_THRESHOLD = 10;

router.get("/products", authenticateToken, async (req: Request, res: Response) => {
  const { lowStock } = req.query;
  const products = lowStock === "true"
    ? await db.select().from(productsTable).where(lte(productsTable.stockQuantity, LOW_STOCK_THRESHOLD - 1))
    : await db.select().from(productsTable);
  res.json(products.map(formatProduct));
});

router.post("/products", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات غير صحيحة" });
    return;
  }

  const inserted = await db.insert(productsTable).values({
    name: body.data.name,
    type: (body.data.type ?? "other") as "chicks" | "chickens" | "other",
    unitPrice: body.data.unitPrice,
    stockQuantity: body.data.stockQuantity ?? 0,
    description: body.data.description ?? null,
  }).returning();

  res.status(201).json(formatProduct(inserted[0]));
});

router.get("/products/:id", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (!id || isNaN(id)) { res.status(400).json({ message: "معرف غير صالح" }); return; }
  const products = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!products[0]) {
    res.status(404).json({ message: "المنتج غير موجود" });
    return;
  }
  res.json(formatProduct(products[0]));
});

router.put("/products/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (!id || isNaN(id)) { res.status(400).json({ message: "معرف غير صالح" }); return; }
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات غير صحيحة" });
    return;
  }

  const updated = await db.update(productsTable).set({
    name: body.data.name,
    type: (body.data.type ?? "other") as "chicks" | "chickens" | "other",
    unitPrice: body.data.unitPrice,
    stockQuantity: body.data.stockQuantity ?? 0,
    description: body.data.description ?? null,
  }).where(eq(productsTable.id, id)).returning();

  if (!updated[0]) {
    res.status(404).json({ message: "المنتج غير موجود" });
    return;
  }

  res.json(formatProduct(updated[0]));
});

router.delete("/products/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (!id || isNaN(id)) { res.status(400).json({ message: "معرف غير صالح" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).send();
});

export default router;
