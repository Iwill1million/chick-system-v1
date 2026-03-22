import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, "admin"));
  if (existing.length > 0) {
    console.log("Admin user already exists, skipping seed.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(usersTable).values({
    name: "المدير",
    username: "admin",
    passwordHash,
    role: "admin",
    phone: null,
  });

  console.log("Created admin user: username=admin, password=admin123");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
