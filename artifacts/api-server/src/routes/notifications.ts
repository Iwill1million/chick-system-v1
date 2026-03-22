import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { authenticateToken, AuthPayload } from "../middlewares/auth";
import { MarkNotificationsReadBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    userId: n.userId,
    message: n.message,
    orderId: n.orderId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const notifications = await db.select().from(notificationsTable).where(
    eq(notificationsTable.userId, authReq.user.userId)
  );
  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(notifications.map(formatNotification));
});

router.post("/notifications/mark-read", authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const body = MarkNotificationsReadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }

  if (body.data.all) {
    await db.update(notificationsTable).set({ isRead: true }).where(
      eq(notificationsTable.userId, authReq.user.userId)
    );
  } else if (body.data.ids && body.data.ids.length > 0) {
    await db.update(notificationsTable).set({ isRead: true }).where(
      and(
        eq(notificationsTable.userId, authReq.user.userId),
        inArray(notificationsTable.id, body.data.ids)
      )
    );
  }

  res.json({ success: true });
});

export default router;
