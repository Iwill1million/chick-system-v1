import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { deliveryLogsTable, notificationsTable, usersTable, ordersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, AuthPayload } from "../middlewares/auth";
import { CreateDeliveryLogBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

function formatLog(log: typeof deliveryLogsTable.$inferSelect) {
  return {
    id: log.id,
    orderId: log.orderId,
    agentId: log.agentId,
    collectedAmount: log.collectedAmount,
    deliveredQuantity: log.deliveredQuantity,
    fuelExpense: log.fuelExpense,
    otherExpenses: log.otherExpenses,
    notes: log.notes,
    loggedAt: log.loggedAt.toISOString(),
  };
}

router.post("/delivery-logs", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const body = CreateDeliveryLogBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  const orderId = body.data.orderId;

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!orders[0]) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  const order = orders[0];

  if (authReq.user.role !== "admin" && order.agentId !== authReq.user.userId) {
    res.status(403).json({ message: "You are not authorized to log delivery for this order" });
    return;
  }

  const inserted = await db.insert(deliveryLogsTable).values({
    orderId,
    agentId: authReq.user.userId,
    collectedAmount: body.data.collectedAmount,
    deliveredQuantity: body.data.deliveredQuantity,
    fuelExpense: body.data.fuelExpense,
    otherExpenses: body.data.otherExpenses,
    notes: body.data.notes ?? null,
  }).returning();

  const admins = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
  if (admins.length > 0) {
    await db.insert(notificationsTable).values(
      admins.map(admin => ({
        userId: admin.id,
        message: `المندوب سجّل تفاصيل توصيل الطلب #${orderId}`,
        orderId,
        isRead: false,
      }))
    );
  }

  res.status(201).json(formatLog(inserted[0]));
});

router.get("/delivery-logs/:orderId", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const orderId = parseInt(String(req.params["orderId"] ?? "0"));

  if (authReq.user.role !== "admin") {
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!orders[0] || orders[0].agentId !== authReq.user.userId) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
  }

  const logs = await db.select().from(deliveryLogsTable).where(eq(deliveryLogsTable.orderId, orderId));
  res.json(logs.map(formatLog));
});

export default router;
