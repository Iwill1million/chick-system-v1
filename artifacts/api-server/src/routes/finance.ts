import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { ordersTable, deliveryLogsTable, customersTable, productsTable, usersTable, orderItemsTable, customerPaymentsTable } from "@workspace/db/schema";
import { eq, gte, lte, and, inArray, SQL } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/finance/summary", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { from, to } = req.query;

  const fromStr = typeof from === "string" ? from : undefined;
  const toStr = typeof to === "string" ? to : undefined;

  const dateConditions: SQL[] = [];
  if (fromStr) dateConditions.push(gte(ordersTable.orderDate, fromStr));
  if (toStr) dateConditions.push(lte(ordersTable.orderDate, toStr));

  const allOrders = dateConditions.length > 0
    ? await db.select().from(ordersTable).where(and(...dateConditions))
    : await db.select().from(ordersTable);

  const orderIds = allOrders.map(o => o.id);

  const totalOrders = allOrders.length;
  const deliveredOrders = allOrders.filter(o => o.status === "delivered").length;

  const statusCounts: Record<string, number> = {};
  for (const order of allOrders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
  }
  const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // Daily order counts within the filtered range (fill zeros for every day)
  const dailyOrderMap = new Map<string, number>();
  for (const order of allOrders) {
    dailyOrderMap.set(order.orderDate, (dailyOrderMap.get(order.orderDate) ?? 0) + 1);
  }
  // Fill zero for every calendar day in the [from, to] window
  const dailyOrders: { date: string; count: number }[] = [];
  if (fromStr && toStr) {
    const cursor = new Date(fromStr);
    const end = new Date(toStr);
    while (cursor <= end) {
      const d = cursor.toISOString().slice(0, 10);
      dailyOrders.push({ date: d, count: dailyOrderMap.get(d) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    Array.from(dailyOrderMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => dailyOrders.push({ date, count }));
  }

  // All-time data for receivables and customer real balances (unaffected by date filter)
  const [allPaymentsForReceivables, allOrdersForReceivables, allOrderItemsForReceivables] = await Promise.all([
    db.select().from(customerPaymentsTable),
    db.select().from(ordersTable),
    db.select().from(orderItemsTable),
  ]);
  const allCustomersForReceivables = await db.select().from(customersTable);

  const nonCancelledOrderIds = new Set(allOrdersForReceivables.filter(o => o.status !== "cancelled").map(o => o.id));
  const orderItemTotals = new Map<number, number>();
  for (const item of allOrderItemsForReceivables) {
    if (!nonCancelledOrderIds.has(item.orderId)) continue;
    orderItemTotals.set(item.orderId, (orderItemTotals.get(item.orderId) ?? 0) + parseFloat(item.unitPrice) * item.quantity);
  }

  const customerOrderDebits = new Map<number, number>();
  for (const order of allOrdersForReceivables) {
    if (!nonCancelledOrderIds.has(order.id)) continue;
    customerOrderDebits.set(order.customerId, (customerOrderDebits.get(order.customerId) ?? 0) + (orderItemTotals.get(order.id) ?? 0));
  }

  const customerPaymentTotals = new Map<number, number>();
  for (const payment of allPaymentsForReceivables) {
    customerPaymentTotals.set(payment.customerId, (customerPaymentTotals.get(payment.customerId) ?? 0) + parseFloat(payment.amount));
  }

  let totalReceivables = 0;
  for (const c of allCustomersForReceivables) {
    const balance = parseFloat(c.openingBalance as string) + (customerOrderDebits.get(c.id) ?? 0) - (customerPaymentTotals.get(c.id) ?? 0);
    if (balance > 0) totalReceivables += balance;
  }

  if (orderIds.length === 0) {
    const allProducts = await db.select().from(productsTable);
    const emptyCustomerBalances = allCustomersForReceivables.map(c => {
      const realBalance = parseFloat(c.openingBalance as string) + (customerOrderDebits.get(c.id) ?? 0) - (customerPaymentTotals.get(c.id) ?? 0);
      return {
        customerId: c.id,
        customerName: c.name,
        openingBalance: c.openingBalance,
        totalOrders: 0,
        totalCollected: "0.00",
        balance: realBalance.toFixed(2),
      };
    }).sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

    res.json({
      totalOrders: 0,
      deliveredOrders: 0,
      totalRevenue: "0.00",
      totalCollected: "0.00",
      totalReceivables: totalReceivables.toFixed(2),
      ordersByStatus: [],
      agentPerformance: [],
      customerBalances: emptyCustomerBalances,
      productSales: allProducts.map(p => ({ productId: p.id, productName: p.name, unitsSold: 0, totalRevenue: "0.00" })),
      dailyOrders: [],
    });
    return;
  }

  const [relevantItems, relevantLogs] = await Promise.all([
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)),
    db.select().from(deliveryLogsTable).where(inArray(deliveryLogsTable.orderId, orderIds)),
  ]);

  // Non-cancelled order IDs within the date range (for accurate revenue)
  const nonCancelledInRange = new Set(allOrders.filter(o => o.status !== "cancelled").map(o => o.id));

  // Total revenue excludes cancelled orders
  let totalRevenue = 0;
  for (const item of relevantItems) {
    if (!nonCancelledInRange.has(item.orderId)) continue;
    totalRevenue += parseFloat(item.unitPrice) * item.quantity;
  }

  let totalCollected = 0;
  for (const log of relevantLogs) {
    totalCollected += parseFloat(log.collectedAmount);
  }

  const agents = await db.select().from(usersTable).where(eq(usersTable.role, "agent"));
  const agentPerformance = agents.map(agent => {
    const agentOrders = allOrders.filter(o => o.agentId === agent.id && o.status === "delivered");
    const agentLogs = relevantLogs.filter(l => l.agentId === agent.id);
    const agentCollected = agentLogs.reduce((sum, l) => sum + parseFloat(l.collectedAmount), 0);
    const agentFuel = agentLogs.reduce((sum, l) => sum + parseFloat(l.fuelExpense), 0);
    const agentOther = agentLogs.reduce((sum, l) => sum + parseFloat(l.otherExpenses), 0);
    return {
      agentId: agent.id,
      agentName: agent.name,
      ordersCompleted: agentOrders.length,
      totalCollected: agentCollected.toFixed(2),
      totalFuelExpense: agentFuel.toFixed(2),
      totalOtherExpenses: agentOther.toFixed(2),
    };
  });

  const allCustomers = await db.select().from(customersTable);
  const customerBalances = allCustomers.map(customer => {
    const customerOrders = allOrders.filter(o => o.customerId === customer.id);
    const customerOrderIds = new Set(customerOrders.map(o => o.id));
    const customerLogs = relevantLogs.filter(l => customerOrderIds.has(l.orderId));
    const collected = customerLogs.reduce((sum, l) => sum + parseFloat(l.collectedAmount), 0);
    // Real balance: all-time (openingBalance + all non-cancelled orders - all payments)
    const realBalance = parseFloat(customer.openingBalance as string)
      + (customerOrderDebits.get(customer.id) ?? 0)
      - (customerPaymentTotals.get(customer.id) ?? 0);
    return {
      customerId: customer.id,
      customerName: customer.name,
      openingBalance: customer.openingBalance,
      totalOrders: customerOrders.length,
      totalCollected: collected.toFixed(2),
      balance: realBalance.toFixed(2),
    };
  }).sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

  const allProducts = await db.select().from(productsTable);
  // Product sales excludes cancelled orders
  const productSales = allProducts.map(product => {
    const productItems = relevantItems.filter(i => i.productId === product.id && nonCancelledInRange.has(i.orderId));
    const unitsSold = productItems.reduce((sum, i) => sum + i.quantity, 0);
    const revenue = productItems.reduce((sum, i) => sum + parseFloat(i.unitPrice) * i.quantity, 0);
    return {
      productId: product.id,
      productName: product.name,
      unitsSold,
      totalRevenue: revenue.toFixed(2),
    };
  });

  res.json({
    totalOrders,
    deliveredOrders,
    totalRevenue: totalRevenue.toFixed(2),
    totalCollected: totalCollected.toFixed(2),
    totalReceivables: totalReceivables.toFixed(2),
    ordersByStatus,
    agentPerformance,
    customerBalances,
    productSales,
    dailyOrders,
  });
});

router.get("/finance/agent-report", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const fromStr = typeof from === "string" ? from : undefined;
  const toStr = typeof to === "string" ? to : undefined;

  const dateConditions: SQL[] = [eq(ordersTable.status, "delivered")];
  if (fromStr) dateConditions.push(gte(ordersTable.orderDate, fromStr));
  if (toStr) dateConditions.push(lte(ordersTable.orderDate, toStr));

  const [deliveredOrders, allAgents] = await Promise.all([
    db.select().from(ordersTable).where(and(...dateConditions)),
    db.select().from(usersTable).where(eq(usersTable.role, "agent")),
  ]);

  const orderIds = deliveredOrders.map(o => o.id);

  const logs = orderIds.length > 0
    ? await db.select().from(deliveryLogsTable).where(inArray(deliveryLogsTable.orderId, orderIds))
    : [];

  const agentReport = allAgents.map(agent => {
    const agentOrders = deliveredOrders.filter(o => o.agentId === agent.id);
    const agentLogs = logs.filter(l => l.agentId === agent.id);
    const totalCollected = agentLogs.reduce((s, l) => s + parseFloat(l.collectedAmount), 0);
    const totalFuelExpense = agentLogs.reduce((s, l) => s + parseFloat(l.fuelExpense), 0);
    const totalOtherExpenses = agentLogs.reduce((s, l) => s + parseFloat(l.otherExpenses), 0);
    const netAmount = totalCollected - totalFuelExpense - totalOtherExpenses;
    return {
      agentId: agent.id,
      agentName: agent.name,
      ordersCompleted: agentOrders.length,
      totalCollected: totalCollected.toFixed(2),
      totalFuelExpense: totalFuelExpense.toFixed(2),
      totalOtherExpenses: totalOtherExpenses.toFixed(2),
      netAmount: netAmount.toFixed(2),
    };
  });

  res.json(agentReport);
});

export default router;
