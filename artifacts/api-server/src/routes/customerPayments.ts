import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  customerPaymentsTable,
  customersTable,
  ordersTable,
  orderItemsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { authenticateToken, requireAdmin, type AuthPayload } from "../middlewares/auth";

type AuthRequest = Request & { user: AuthPayload };

const router: IRouter = Router();

router.get("/customers/:id/payments", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const customerId = parseInt(String(req.params["id"] ?? ""), 10);
  if (!customerId || isNaN(customerId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

  const payments = await db
    .select({
      id: customerPaymentsTable.id,
      customerId: customerPaymentsTable.customerId,
      amount: customerPaymentsTable.amount,
      paymentDate: customerPaymentsTable.paymentDate,
      notes: customerPaymentsTable.notes,
      createdAt: customerPaymentsTable.createdAt,
      createdBy: {
        id: usersTable.id,
        name: usersTable.name,
      },
    })
    .from(customerPaymentsTable)
    .leftJoin(usersTable, eq(customerPaymentsTable.createdBy, usersTable.id))
    .where(eq(customerPaymentsTable.customerId, customerId))
    .orderBy(desc(customerPaymentsTable.paymentDate));

  res.json(payments.map(p => ({
    id: p.id,
    customerId: p.customerId,
    amount: p.amount,
    paymentDate: p.paymentDate,
    notes: p.notes,
    createdAt: p.createdAt?.toISOString() ?? null,
    createdBy: p.createdBy?.id != null
      ? { id: p.createdBy.id, name: p.createdBy.name ?? "مستخدم محذوف" }
      : { id: 0, name: "مستخدم محذوف" },
  })));
});

router.post("/customers/:id/payments", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  const customerId = parseInt(String(req.params["id"] ?? ""), 10);
  if (!customerId || isNaN(customerId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

  const { amount, paymentDate, notes } = req.body ?? {};
  if (!amount || !paymentDate) { res.status(400).json({ message: "بيانات غير صحيحة" }); return; }

  const amountNum = parseFloat(String(amount));
  if (isNaN(amountNum) || amountNum <= 0) { res.status(400).json({ message: "المبلغ يجب أن يكون أكبر من صفر" }); return; }

  const dateStr = String(paymentDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(dateStr))) {
    res.status(400).json({ message: "صيغة التاريخ غير صحيحة (YYYY-MM-DD)" }); return;
  }

  const customers = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
  if (!customers[0]) { res.status(404).json({ message: "العميل غير موجود" }); return; }

  const userId = req.user.userId;
  const inserted = await db.insert(customerPaymentsTable).values({
    customerId,
    amount: amountNum.toFixed(2),
    paymentDate: String(paymentDate),
    notes: notes ? String(notes) : null,
    createdBy: userId,
  }).returning();

  res.status(201).json({
    id: inserted[0].id,
    customerId: inserted[0].customerId,
    amount: inserted[0].amount,
    paymentDate: inserted[0].paymentDate,
    notes: inserted[0].notes,
    createdAt: inserted[0].createdAt.toISOString(),
  });
});

router.delete("/customers/:id/payments/:paymentId", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const customerId = parseInt(String(req.params["id"] ?? ""), 10);
  const paymentId = parseInt(String(req.params["paymentId"] ?? ""), 10);
  if (!customerId || isNaN(customerId) || !paymentId || isNaN(paymentId)) {
    res.status(400).json({ message: "معرف غير صالح" }); return;
  }
  const deleted = await db.delete(customerPaymentsTable)
    .where(and(eq(customerPaymentsTable.id, paymentId), eq(customerPaymentsTable.customerId, customerId)))
    .returning({ id: customerPaymentsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ message: "الدفعة غير موجودة" }); return;
  }
  res.status(204).send();
});

router.get("/customers/:id/statement", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const customerId = parseInt(String(req.params["id"] ?? ""), 10);
  if (!customerId || isNaN(customerId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

  const customers = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
  if (!customers[0]) { res.status(404).json({ message: "العميل غير موجود" }); return; }
  const customer = customers[0];

  const [orders, payments] = await Promise.all([
    db.select().from(ordersTable).where(eq(ordersTable.customerId, customerId)).orderBy(ordersTable.orderDate),
    db
      .select({
        id: customerPaymentsTable.id,
        amount: customerPaymentsTable.amount,
        paymentDate: customerPaymentsTable.paymentDate,
        notes: customerPaymentsTable.notes,
        createdAt: customerPaymentsTable.createdAt,
        createdByName: usersTable.name,
      })
      .from(customerPaymentsTable)
      .leftJoin(usersTable, eq(customerPaymentsTable.createdBy, usersTable.id))
      .where(eq(customerPaymentsTable.customerId, customerId))
      .orderBy(customerPaymentsTable.paymentDate),
  ]);

  const nonCancelledOrderIds = orders.filter(o => o.status !== "cancelled").map(o => o.id);
  const orderItems = nonCancelledOrderIds.length > 0
    ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, nonCancelledOrderIds))
    : [];

  const orderTotalsMap = new Map<number, number>();
  for (const item of orderItems) {
    const prev = orderTotalsMap.get(item.orderId) ?? 0;
    orderTotalsMap.set(item.orderId, prev + parseFloat(item.unitPrice) * item.quantity);
  }

  type TxEntry =
    | { type: "order"; date: string; id: number; status: string; total: number; notes: string | null }
    | { type: "payment"; date: string; id: number; amount: number; notes: string | null; createdByName: string | null };

  const transactions: TxEntry[] = [
    ...orders.map(o => ({
      type: "order" as const,
      date: o.orderDate,
      id: o.id,
      status: o.status,
      total: orderTotalsMap.get(o.id) ?? 0,
      notes: o.notes,
    })),
    ...payments.map(p => ({
      type: "payment" as const,
      date: p.paymentDate,
      id: p.id,
      amount: parseFloat(p.amount),
      notes: p.notes,
      createdByName: p.createdByName ?? "مستخدم محذوف",
    })),
  ];

  transactions.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.type === b.type) return a.id - b.id;
    return a.type === "order" ? -1 : 1;
  });

  let runningBalance = parseFloat(customer.openingBalance as string);
  const enriched = transactions.map(tx => {
    if (tx.type === "order") {
      if (tx.status !== "cancelled") {
        runningBalance += tx.total;
      }
      return { ...tx, runningBalance };
    } else {
      runningBalance -= tx.amount;
      return { ...tx, runningBalance };
    }
  });

  const totalOrders = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (orderTotalsMap.get(o.id) ?? 0), 0);
  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const currentBalance = parseFloat(customer.openingBalance as string) + totalOrders - totalPaid;

  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      location: customer.location,
      openingBalance: customer.openingBalance,
    },
    summary: {
      openingBalance: parseFloat(customer.openingBalance as string).toFixed(2),
      totalOrders: totalOrders.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      currentBalance: currentBalance.toFixed(2),
    },
    transactions: enriched,
  });
});

export default router;
