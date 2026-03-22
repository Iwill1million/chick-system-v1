import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  productsTable,
  customersTable,
  customerPaymentsTable,
  whatsappLogsTable,
} from "@workspace/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import twilio from "twilio";

const router: IRouter = Router();

function getTwilioClient() {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  if (!sid || !token) {
    throw new Error("TWILIO_NOT_CONFIGURED");
  }
  return twilio(sid, token);
}

function getTwilioFrom(): string {
  const from = process.env["TWILIO_WHATSAPP_FROM"];
  if (!from) throw new Error("TWILIO_NOT_CONFIGURED");
  return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return `+966${digits.slice(1)}`;
  }
  if (!digits.startsWith("+")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

router.get("/whatsapp/config-status", authenticateToken, requireAdmin, (_req: Request, res: Response) => {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_WHATSAPP_FROM"];
  res.json({
    configured: !!(sid && token && from),
    hasSid: !!sid,
    hasToken: !!token,
    hasFrom: !!from,
    fromNumber: from ? from.replace(/^whatsapp:/, "") : null,
  });
});

router.post("/whatsapp/test-ping", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const client = getTwilioClient();
    const account = await client.api.accounts(process.env["TWILIO_ACCOUNT_SID"]!).fetch();
    res.json({ ok: true, accountName: account.friendlyName, status: account.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف";
    if (msg === "TWILIO_NOT_CONFIGURED") {
      res.status(400).json({ ok: false, error: "لم يتم إعداد بيانات Twilio في متغيرات البيئة" });
    } else {
      res.status(502).json({ ok: false, error: msg });
    }
  }
});

router.post(
  "/whatsapp/order-confirmation/:orderId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const orderId = parseInt(String(req.params["orderId"] ?? ""), 10);
    if (!orderId || isNaN(orderId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

    const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    const order = orders[0];
    if (!order) { res.status(404).json({ message: "الطلب غير موجود" }); return; }

    const customers = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
    const customer = customers[0];
    if (!customer) { res.status(404).json({ message: "العميل غير موجود" }); return; }
    if (!customer.phone) {
      res.status(422).json({ message: "العميل لا يملك رقم هاتف مُسجَّل" });
      return;
    }

    const items = await db
      .select({ quantity: orderItemsTable.quantity, unitPrice: orderItemsTable.unitPrice, productId: orderItemsTable.productId })
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));

    const productIds = items.map(i => i.productId);
    const products = productIds.length > 0
      ? await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(inArray(productsTable.id, productIds))
      : [];
    const productMap = new Map(products.map(p => [p.id, p.name]));

    const total = items.reduce((s, i) => s + i.quantity * parseFloat(i.unitPrice), 0);
    const itemLines = items.map(i => `  • ${productMap.get(i.productId) ?? "منتج"}: ${i.quantity} × ${parseFloat(i.unitPrice).toFixed(2)} ج.م`).join("\n");

    const body =
      `مرحباً ${customer.name} 👋\n\n` +
      `تم استلام طلبك بنجاح ✅\n\n` +
      `📦 *تفاصيل الطلب #${order.id}*\n` +
      `${itemLines}\n\n` +
      `💰 *الإجمالي:* ${total.toFixed(2)} ج.م\n` +
      `📅 *تاريخ الطلب:* ${order.orderDate}\n\n` +
      `شكراً لتعاملكم معنا 🙏`;

    const toPhone = normalizePhone(customer.phone);

    try {
      const client = getTwilioClient();
      await client.messages.create({ from: getTwilioFrom(), to: `whatsapp:${toPhone}`, body });

      await db.insert(whatsappLogsTable).values({
        customerId: customer.id,
        orderId: order.id,
        messageType: "order_confirmation",
        status: "sent",
        toPhone,
      });

      res.json({ ok: true, toPhone });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
      const isNotConfigured = errorMessage === "TWILIO_NOT_CONFIGURED";

      await db.insert(whatsappLogsTable).values({
        customerId: customer.id,
        orderId: order.id,
        messageType: "order_confirmation",
        status: "failed",
        toPhone,
        errorMessage: isNotConfigured ? "Twilio not configured" : errorMessage,
      });

      res.status(isNotConfigured ? 400 : 502).json({
        ok: false,
        error: isNotConfigured ? "لم يتم إعداد بيانات Twilio في متغيرات البيئة" : errorMessage,
      });
    }
  }
);

router.post(
  "/whatsapp/delivery-notice/:orderId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const orderId = parseInt(String(req.params["orderId"] ?? ""), 10);
    if (!orderId || isNaN(orderId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

    const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    const order = orders[0];
    if (!order) { res.status(404).json({ message: "الطلب غير موجود" }); return; }

    const customers = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
    const customer = customers[0];
    if (!customer) { res.status(404).json({ message: "العميل غير موجود" }); return; }
    if (!customer.phone) {
      res.status(422).json({ message: "العميل لا يملك رقم هاتف مُسجَّل" });
      return;
    }

    const items = await db
      .select({ quantity: orderItemsTable.quantity, unitPrice: orderItemsTable.unitPrice })
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));
    const total = items.reduce((s, i) => s + i.quantity * parseFloat(i.unitPrice), 0);

    const body =
      `مرحباً ${customer.name} 👋\n\n` +
      `🎉 تم تسليم طلبك بنجاح!\n\n` +
      `📦 *الطلب #${order.id}*\n` +
      `💰 *الإجمالي:* ${total.toFixed(2)} ج.م\n` +
      `📅 *تاريخ التسليم:* ${order.deliveryDate ?? order.orderDate}\n\n` +
      `نشكركم على ثقتكم بنا 🙏`;

    const toPhone = normalizePhone(customer.phone);

    try {
      const client = getTwilioClient();
      await client.messages.create({ from: getTwilioFrom(), to: `whatsapp:${toPhone}`, body });

      await db.insert(whatsappLogsTable).values({
        customerId: customer.id,
        orderId: order.id,
        messageType: "delivery_notice",
        status: "sent",
        toPhone,
      });

      res.json({ ok: true, toPhone });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
      const isNotConfigured = errorMessage === "TWILIO_NOT_CONFIGURED";

      await db.insert(whatsappLogsTable).values({
        customerId: customer.id,
        orderId: order.id,
        messageType: "delivery_notice",
        status: "failed",
        toPhone,
        errorMessage: isNotConfigured ? "Twilio not configured" : errorMessage,
      });

      res.status(isNotConfigured ? 400 : 502).json({
        ok: false,
        error: isNotConfigured ? "لم يتم إعداد بيانات Twilio في متغيرات البيئة" : errorMessage,
      });
    }
  }
);

router.post(
  "/whatsapp/customer-statement/:customerId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const customerId = parseInt(String(req.params["customerId"] ?? ""), 10);
    if (!customerId || isNaN(customerId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

    const customers = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
    const customer = customers[0];
    if (!customer) { res.status(404).json({ message: "العميل غير موجود" }); return; }
    if (!customer.phone) {
      res.status(422).json({ message: "العميل لا يملك رقم هاتف مُسجَّل" });
      return;
    }

    const [orders, payments] = await Promise.all([
      db.select().from(ordersTable).where(eq(ordersTable.customerId, customerId)),
      db.select().from(customerPaymentsTable).where(eq(customerPaymentsTable.customerId, customerId)),
    ]);

    const nonCancelledIds = orders.filter(o => o.status !== "cancelled").map(o => o.id);
    const items = nonCancelledIds.length > 0
      ? await db.select({ orderId: orderItemsTable.orderId, quantity: orderItemsTable.quantity, unitPrice: orderItemsTable.unitPrice })
          .from(orderItemsTable).where(inArray(orderItemsTable.orderId, nonCancelledIds))
      : [];

    const totalOrders = items.reduce((s, i) => s + i.quantity * parseFloat(i.unitPrice), 0);
    const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const openingBalance = parseFloat(customer.openingBalance as string);
    const currentBalance = openingBalance + totalOrders - totalPaid;

    const balanceLabel = currentBalance > 0
      ? `🔴 مستحق عليك: ${currentBalance.toFixed(2)} ج.م`
      : currentBalance < 0
      ? `🟢 رصيد دائن: ${Math.abs(currentBalance).toFixed(2)} ج.م`
      : "✅ الحساب مسوّى";

    const body =
      `مرحباً ${customer.name} 👋\n\n` +
      `📊 *ملخص كشف حسابك*\n\n` +
      `📦 إجمالي الطلبات: ${totalOrders.toFixed(2)} ج.م\n` +
      `💳 إجمالي المدفوع: ${totalPaid.toFixed(2)} ج.م\n` +
      `${balanceLabel}\n\n` +
      `للاستفسار تواصل معنا 📞`;

    const toPhone = normalizePhone(customer.phone);

    try {
      const client = getTwilioClient();
      await client.messages.create({ from: getTwilioFrom(), to: `whatsapp:${toPhone}`, body });

      await db.insert(whatsappLogsTable).values({
        customerId: customer.id,
        orderId: null,
        messageType: "customer_statement",
        status: "sent",
        toPhone,
      });

      res.json({ ok: true, toPhone });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
      const isNotConfigured = errorMessage === "TWILIO_NOT_CONFIGURED";

      await db.insert(whatsappLogsTable).values({
        customerId: customer.id,
        orderId: null,
        messageType: "customer_statement",
        status: "failed",
        toPhone,
        errorMessage: isNotConfigured ? "Twilio not configured" : errorMessage,
      });

      res.status(isNotConfigured ? 400 : 502).json({
        ok: false,
        error: isNotConfigured ? "لم يتم إعداد بيانات Twilio في متغيرات البيئة" : errorMessage,
      });
    }
  }
);

router.get(
  "/whatsapp/logs/order/:orderId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const orderId = parseInt(String(req.params["orderId"] ?? ""), 10);
    if (!orderId || isNaN(orderId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

    const logs = await db
      .select()
      .from(whatsappLogsTable)
      .where(eq(whatsappLogsTable.orderId, orderId))
      .orderBy(desc(whatsappLogsTable.sentAt));

    res.json(logs);
  }
);

router.get(
  "/whatsapp/logs/customer/:customerId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const customerId = parseInt(String(req.params["customerId"] ?? ""), 10);
    if (!customerId || isNaN(customerId)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

    const logs = await db
      .select()
      .from(whatsappLogsTable)
      .where(eq(whatsappLogsTable.customerId, customerId))
      .orderBy(desc(whatsappLogsTable.sentAt));

    res.json(logs.slice(0, 20));
  }
);

export default router;
