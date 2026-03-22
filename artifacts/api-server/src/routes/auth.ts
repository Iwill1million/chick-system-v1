import { Router, type IRouter, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, signToken, AuthPayload } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req: Request, res: Response) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  const { username, password } = body.data;
  const users = await db.select().from(usersTable).where(eq(usersTable.username, username));
  const user = users[0];

  if (!user) {
    res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    return;
  }

  const payload: AuthPayload = { userId: user.id, role: user.role as "admin" | "agent", username: user.username };
  const token = signToken(payload);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as Request & { user: AuthPayload };
  const users = await db.select().from(usersTable).where(eq(usersTable.id, authReq.user.userId));
  const user = users[0];

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
