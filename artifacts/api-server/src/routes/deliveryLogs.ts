import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  deliveryLogsTable,
  deliveryLogItemsTable,
  deliveryLogExpensesTable,
  notificationsTable,
  usersTable,
  ordersTable,
  orderItemsTable,
  productsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, AuthPayload } from "../middlewares/auth";
import { CreateDeliveryLogBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

async function formatLog(log: typeof deliveryLogsTable.$inferSelect) {
  const items = await db
    .select({
      id: deliveryLogItemsTable.id,
      productId: deliveryLogItemsTable.productId,
      productName: productsTable.name,
      orderedQty: deliveryLogItemsTable.orderedQty,
      deliveredQty: deliveryLogItemsTable.deliveredQty,
    })
    .from(deliveryLogItemsTable)
    .leftJoin(productsTable, eq(deliveryLogItemsTable.productId, productsTable.id))
    .where(eq(deliveryLogItemsTable.deliveryLogId, log.id));

  const expenses = await db
    .select()
    .from(deliveryLogExpensesTable)
    .where(eq(deliveryLogExpensesTable.deliveryLogId, log.id));

  return {
    id: log.id,
    orderId: log.orderId,
    agentId: log.agentId,
    collectedAmount: log.collectedAmount,
    deliveredQuantity: log.deliveredQuantity,
    fuelExpense: log.fuelExpense,
    otherExpenses: log.otherExpenses,
    notes: log.notes,
    paymentMethod: log.paymentMethod,
    paymentImageUrl: log.paymentImageUrl,
    loggedAt: log.loggedAt.toISOString(),
    items: items.map(i => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName ?? undefined,
      orderedQty: i.orderedQty,
      deliveredQty: i.deliveredQty,
    })),
    expenses: expenses.map(e => ({
      id: e.id,
      category: e.category,
      amount: e.amount,
      description: e.description,
    })),
  };
}

router.post("/delivery-logs", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const body = CreateDeliveryLogBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات غير صحيحة" });
    return;
  }

  const orderId = body.data.orderId;

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!orders[0]) {
    res.status(404).json({ message: "الطلب غير موجود" });
    return;
  }

  const order = orders[0];

  if (authReq.user.role !== "admin" && order.agentId !== authReq.user.userId) {
    res.status(403).json({ message: "غير مصرح لك بتسجيل توصيل هذا الطلب" });
    return;
  }

  if (body.data.items && body.data.items.length > 0) {
    const orderItems = await db
      .select({ productId: orderItemsTable.productId, quantity: orderItemsTable.quantity })
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));

    const orderProductMap = new Map(orderItems.map(i => [i.productId, i.quantity]));

    for (const item of body.data.items) {
      if (!orderProductMap.has(item.productId)) {
        res.status(400).json({ message: `المنتج ${item.productId} غير موجود في الطلب` });
        return;
      }
      if (item.deliveredQty < 0) {
        res.status(400).json({ message: "الكمية المسلمة لا يمكن أن تكون سالبة" });
        return;
      }
    }
  }

  const logAgentId = authReq.user.role === "admin" && order.agentId
    ? order.agentId
    : authReq.user.userId;

  const result = await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(deliveryLogsTable).values({
      orderId,
      agentId: logAgentId,
      collectedAmount: body.data.collectedAmount,
      deliveredQuantity: body.data.deliveredQuantity,
      fuelExpense: body.data.fuelExpense,
      otherExpenses: body.data.otherExpenses,
      notes: body.data.notes ?? null,
      paymentMethod: body.data.paymentMethod ?? "cash",
      paymentImageUrl: body.data.paymentImageUrl ?? null,
    }).returning();

    const logId = inserted.id;

    if (body.data.items && body.data.items.length > 0) {
      await tx.insert(deliveryLogItemsTable).values(
        body.data.items.map(item => ({
          deliveryLogId: logId,
          productId: item.productId,
          orderedQty: item.orderedQty,
          deliveredQty: item.deliveredQty,
        }))
      );
    }

    if (body.data.expenses && body.data.expenses.length > 0) {
      await tx.insert(deliveryLogExpensesTable).values(
        body.data.expenses.map(exp => ({
          deliveryLogId: logId,
          category: exp.category,
          amount: exp.amount,
          description: exp.description ?? null,
        }))
      );
    }

    return inserted;
  });

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

  const formatted = await formatLog(result);
  res.status(201).json(formatted);
});

router.get("/delivery-logs/:orderId", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const orderId = parseInt(String(req.params["orderId"] ?? ""), 10);
  if (!orderId || isNaN(orderId)) { res.status(400).json({ message: "معرف الطلب غير صالح" }); return; }

  if (authReq.user.role !== "admin") {
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!orders[0] || orders[0].agentId !== authReq.user.userId) {
      res.status(403).json({ message: "غير مصرح بالوصول" });
      return;
    }
  }

  const logs = await db.select().from(deliveryLogsTable).where(eq(deliveryLogsTable.orderId, orderId));
  const formatted = await Promise.all(logs.map(formatLog));
  res.json(formatted);
});

export default router;
