import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, customersTable, usersTable, productsTable, notificationsTable, deliveryLogsTable } from "@workspace/db/schema";
import { eq, and, SQL } from "drizzle-orm";
import { authenticateToken, requireAdmin, AuthPayload } from "../middlewares/auth";
import { CreateOrderBody, UpdateOrderBody, UpdateOrderStatusBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

async function getOrderWithDetails(orderId: number) {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  const order = orders[0];
  if (!order) return null;

  const customers = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
  const customer = customers[0];

  let agent = null;
  if (order.agentId) {
    const agents = await db.select().from(usersTable).where(eq(usersTable.id, order.agentId));
    if (agents[0]) {
      agent = {
        id: agents[0].id,
        name: agents[0].name,
        phone: agents[0].phone,
        username: agents[0].username,
        role: agents[0].role,
        createdAt: agents[0].createdAt.toISOString(),
      };
    }
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  const itemsWithProducts = await Promise.all(items.map(async (item) => {
    const products = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    const product = products[0];
    return {
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      product: product ? {
        id: product.id,
        name: product.name,
        type: product.type,
        unitPrice: product.unitPrice,
        stockQuantity: product.stockQuantity,
        description: product.description,
        createdAt: product.createdAt.toISOString(),
      } : null,
    };
  }));

  return {
    id: order.id,
    customerId: order.customerId,
    agentId: order.agentId,
    status: order.status,
    orderDate: order.orderDate,
    deliveryDate: order.deliveryDate,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    customer: customer ? {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      location: customer.location,
      openingBalance: customer.openingBalance,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
    } : null,
    agent,
    items: itemsWithProducts,
  };
}

router.get("/orders", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { status, agentId } = req.query;

  const conditions: SQL[] = [];

  if (authReq.user.role === "agent") {
    conditions.push(eq(ordersTable.agentId, authReq.user.userId));
  } else if (agentId && typeof agentId === "string") {
    const parsedAgentId = parseInt(agentId, 10);
    if (!isNaN(parsedAgentId)) conditions.push(eq(ordersTable.agentId, parsedAgentId));
  }

  if (status && typeof status === "string") {
    conditions.push(eq(ordersTable.status, status as typeof ordersTable.$inferSelect["status"]));
  }

  const allOrders = conditions.length > 0
    ? await db.select().from(ordersTable).where(and(...conditions))
    : await db.select().from(ordersTable);

  const ordersWithDetails = await Promise.all(allOrders.map(o => getOrderWithDetails(o.id)));
  res.json(ordersWithDetails.filter(Boolean));
});

router.post("/orders", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const body = CreateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات الطلب غير صحيحة" });
    return;
  }

  const { customerId, agentId, orderDate, deliveryDate, notes, items } = body.data;

  const order = await db.transaction(async (tx) => {
    const inserted = await tx.insert(ordersTable).values({
      customerId,
      agentId: agentId ?? null,
      status: "pending",
      orderDate,
      deliveryDate: deliveryDate ?? null,
      notes: notes ?? null,
    }).returning();

    const newOrder = inserted[0];

    if (items && items.length > 0) {
      await tx.insert(orderItemsTable).values(
        items.map(item => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      );
    }

    if (agentId) {
      await tx.insert(notificationsTable).values({
        userId: agentId,
        message: `تم تعيين طلب جديد رقم #${newOrder.id} إليك`,
        orderId: newOrder.id,
        isRead: false,
      });
    }

    return newOrder;
  });

  const result = await getOrderWithDetails(order.id);
  res.status(201).json(result);
});

router.get("/orders/:id", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  const authReq = req as AuthRequest;

  const result = await getOrderWithDetails(id);
  if (!result) {
    res.status(404).json({ message: "الطلب غير موجود" });
    return;
  }

  if (authReq.user.role === "agent" && result.agentId !== authReq.user.userId) {
    res.status(403).json({ message: "غير مصرح بالوصول" });
    return;
  }

  res.json(result);
});

router.put("/orders/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  const body = UpdateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات التعديل غير صحيحة" });
    return;
  }

  const existing = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!existing[0]) {
    res.status(404).json({ message: "الطلب غير موجود" });
    return;
  }

  const oldAgentId = existing[0].agentId;

  const updates: Partial<typeof ordersTable.$inferInsert> = {};
  if (body.data.customerId !== undefined) updates.customerId = body.data.customerId;
  if (body.data.agentId !== undefined) updates.agentId = body.data.agentId;
  if (body.data.status !== undefined) updates.status = body.data.status as typeof ordersTable.$inferInsert["status"];
  if (body.data.orderDate !== undefined) updates.orderDate = body.data.orderDate;
  if (body.data.deliveryDate !== undefined) updates.deliveryDate = body.data.deliveryDate;
  if (body.data.notes !== undefined) updates.notes = body.data.notes;

  await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id));

  if (body.data.items !== undefined) {
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    if (body.data.items.length > 0) {
      await db.insert(orderItemsTable).values(
        body.data.items.map(item => ({
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      );
    }
  }

  const newAgentId = body.data.agentId ?? oldAgentId;
  if (newAgentId && newAgentId !== oldAgentId) {
    await db.insert(notificationsTable).values({
      userId: newAgentId,
      message: `تم تعيين طلب رقم #${id} إليك`,
      orderId: id,
      isRead: false,
    });
  }

  const result = await getOrderWithDetails(id);
  res.json(result);
});

router.delete("/orders/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  await db.delete(notificationsTable).where(eq(notificationsTable.orderId, id));
  await db.delete(deliveryLogsTable).where(eq(deliveryLogsTable.orderId, id));
  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.status(204).send();
});

router.patch("/orders/:id/status", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  const authReq = req as AuthRequest;
  const body = UpdateOrderStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "حالة الطلب غير صحيحة" });
    return;
  }

  const existing = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!existing[0]) {
    res.status(404).json({ message: "الطلب غير موجود" });
    return;
  }

  if (authReq.user.role === "agent" && existing[0].agentId !== authReq.user.userId) {
    res.status(403).json({ message: "غير مصرح بالوصول" });
    return;
  }

  const currentStatus = existing[0].status;
  const newStatus = body.data.status;

  const allowedTransitions: Record<string, string[]> = {
    pending: ["preparing", "cancelled"],
    preparing: ["delivering", "cancelled"],
    delivering: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  const allowed = allowedTransitions[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    res.status(400).json({ message: `لا يمكن تغيير الحالة من "${currentStatus}" إلى "${newStatus}"` });
    return;
  }

  await db.update(ordersTable).set({
    status: newStatus as typeof ordersTable.$inferInsert["status"],
  }).where(eq(ordersTable.id, id));

  const admins = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
  if (admins.length > 0) {
    const statusLabels: Record<string, string> = {
      pending: "قيد الانتظار",
      preparing: "جاري التجهيز",
      delivering: "جاري التوصيل",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };
    await db.insert(notificationsTable).values(
      admins.map(admin => ({
        userId: admin.id,
        message: `تم تحديث حالة الطلب #${id} إلى ${statusLabels[body.data.status] ?? body.data.status}`,
        orderId: id,
        isRead: false,
      }))
    );
  }

  const result = await getOrderWithDetails(id);
  res.json(result);
});

export default router;
