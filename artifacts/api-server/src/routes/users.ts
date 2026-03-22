import { Router, type IRouter, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, requireAdmin, AuthPayload } from "../middlewares/auth";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  const users = await db.select().from(usersTable);
  res.json(users.map(formatUser));
});

router.post("/users", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const body = CreateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات غير صحيحة" });
    return;
  }

  const { name, phone, username, password, role } = body.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const inserted = await db.insert(usersTable).values({
    name,
    phone: phone ?? null,
    username,
    passwordHash,
    role: role as "admin" | "agent",
  }).returning();

  res.status(201).json(formatUser(inserted[0]));
});

router.get("/users/:id", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  const authReq = req as AuthRequest;

  if (authReq.user.role !== "admin" && authReq.user.userId !== id) {
    res.status(403).json({ message: "غير مصرح بالوصول" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!users[0]) {
    res.status(404).json({ message: "المستخدم غير موجود" });
    return;
  }

  res.json(formatUser(users[0]));
});

router.put("/users/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "بيانات غير صحيحة" });
    return;
  }

  const { name, phone, username, password, role } = body.data;
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (username !== undefined) updates.username = username;
  if (role !== undefined) updates.role = role as "admin" | "agent";
  if (password !== undefined) updates.passwordHash = await bcrypt.hash(password, 10);

  const updated = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated[0]) {
    res.status(404).json({ message: "المستخدم غير موجود" });
    return;
  }

  res.json(formatUser(updated[0]));
});

router.delete("/users/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
