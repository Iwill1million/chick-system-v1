import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { ordersTable, deliveryLogsTable, customersTable, productsTable, usersTable, orderItemsTable } from "@workspace/db/schema";
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

  if (orderIds.length === 0) {
    const [allCustomers, allProducts] = await Promise.all([
      db.select().from(customersTable),
      db.select().from(productsTable),
    ]);
    res.json({
      totalOrders: 0,
      deliveredOrders: 0,
      totalRevenue: "0.00",
      totalCollected: "0.00",
      ordersByStatus: [],
      agentPerformance: [],
      customerBalances: allCustomers.map(c => ({ customerId: c.id, customerName: c.name, openingBalance: c.openingBalance, totalOrders: 0, totalCollected: "0.00" })),
      productSales: allProducts.map(p => ({ productId: p.id, productName: p.name, unitsSold: 0, totalRevenue: "0.00" })),
    });
    return;
  }

  const [relevantItems, relevantLogs] = await Promise.all([
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)),
    db.select().from(deliveryLogsTable).where(inArray(deliveryLogsTable.orderId, orderIds)),
  ]);

  let totalRevenue = 0;
  for (const item of relevantItems) {
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
    return {
      customerId: customer.id,
      customerName: customer.name,
      openingBalance: customer.openingBalance,
      totalOrders: customerOrders.length,
      totalCollected: collected.toFixed(2),
    };
  });

  const allProducts = await db.select().from(productsTable);
  const productSales = allProducts.map(product => {
    const productItems = relevantItems.filter(i => i.productId === product.id);
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
    ordersByStatus,
    agentPerformance,
    customerBalances,
    productSales,
  });
});

export default router;
