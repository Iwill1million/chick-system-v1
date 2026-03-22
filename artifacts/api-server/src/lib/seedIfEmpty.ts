import { db } from "@workspace/db";
import { usersTable, customersTable, productsTable, ordersTable, orderItemsTable, companySettingsTable } from "@workspace/db/schema";
import { sql, count } from "drizzle-orm";
import { logger } from "./logger";

export async function seedIfEmpty() {
  const [row] = await db.select({ cnt: count() }).from(usersTable);
  if ((row?.cnt ?? 0) > 0) {
    logger.info("Database already has data — skipping seed");
    return;
  }

  logger.info("Empty database detected — seeding initial data...");

  await db.transaction(async (tx) => {
    await tx.insert(companySettingsTable).values({
      id: 1,
      name: "مزرعة الدواجن الذهبية",
      address: "",
      phone: "",
      commercialRegNo: "",
      logoUrl: "",
      twilioWhatsappFrom: "+14155238886",
    });

    await tx.insert(usersTable).values([
      {
        id: 1,
        name: "المدير",
        phone: null,
        username: "admin",
        passwordHash: "$2a$10$XmaJlEgtAqh2usCV8KtgmusP5ZHLLf1iAto9zn7fmh5Oo3S8N/fQu",
        role: "admin",
      },
      {
        id: 2,
        name: "مندوب التجربة",
        phone: "0500000001",
        username: "agent1",
        passwordHash: "$2b$10$TSvuisP2hXJA.Dq4XElvyeJlifEf1xBrti5CvBFHaVzfv5xi9cRI2",
        role: "agent",
      },
    ]);

    await tx.insert(customersTable).values({
      id: 1,
      name: "محمد أحمد علي",
      phone: "0501234567",
      location: "الرياض، حي النزهة",
      openingBalance: "0.00",
      notes: "",
    });

    await tx.insert(productsTable).values([
      { id: 1, name: "دجاج طازج",    type: "chickens", unitPrice: "45.00", stockQuantity: 100, description: "" },
      { id: 2, name: "دجاج اختبار", type: "chickens", unitPrice: "10.00", stockQuantity: 50,  description: null },
    ]);

    await tx.insert(ordersTable).values([
      { id: 1, customerId: 1, agentId: null, status: "cancelled",  orderDate: "2026-03-22", deliveryDate: "2026-03-23", notes: null },
      { id: 5, customerId: 1, agentId: 2,    status: "delivered",  orderDate: "2026-03-22", deliveryDate: null,         notes: null },
      { id: 6, customerId: 1, agentId: 2,    status: "delivered",  orderDate: "2026-03-22", deliveryDate: null,         notes: null },
      { id: 7, customerId: 1, agentId: 2,    status: "delivering", orderDate: "2026-03-22", deliveryDate: null,         notes: null },
      { id: 8, customerId: 1, agentId: 2,    status: "delivering", orderDate: "2026-03-22", deliveryDate: null,         notes: null },
    ]);

    await tx.insert(orderItemsTable).values([
      { id: 1, orderId: 1, productId: 1, quantity: 500, unitPrice: "45.00" },
      { id: 3, orderId: 5, productId: 1, quantity: 10,  unitPrice: "45.00" },
      { id: 4, orderId: 5, productId: 2, quantity: 20,  unitPrice: "10.00" },
      { id: 5, orderId: 6, productId: 1, quantity: 5,   unitPrice: "45.00" },
      { id: 6, orderId: 7, productId: 2, quantity: 30,  unitPrice: "10.00" },
      { id: 7, orderId: 8, productId: 1, quantity: 8,   unitPrice: "45.00" },
    ]);

    await tx.execute(sql`SELECT setval('public.users_id_seq', 2)`);
    await tx.execute(sql`SELECT setval('public.customers_id_seq', 2)`);
    await tx.execute(sql`SELECT setval('public.products_id_seq', 2)`);
    await tx.execute(sql`SELECT setval('public.orders_id_seq', 8)`);
    await tx.execute(sql`SELECT setval('public.order_items_id_seq', 7)`);
    await tx.execute(sql`SELECT setval('public.company_settings_id_seq', 1)`);
  });

  logger.info("Database seeded successfully ✓ (admin/admin123, agent1/agent123)");
}
