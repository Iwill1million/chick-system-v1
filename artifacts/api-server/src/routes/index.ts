import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import customersRouter from "./customers";
import customerPaymentsRouter from "./customerPayments";
import productsRouter from "./products";
import ordersRouter from "./orders";
import deliveryLogsRouter from "./deliveryLogs";
import notificationsRouter from "./notifications";
import financeRouter from "./finance";
import settingsRouter from "./settings";
import storageRouter from "./storage";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(customersRouter);
router.use(customerPaymentsRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(deliveryLogsRouter);
router.use(notificationsRouter);
router.use(financeRouter);
router.use(settingsRouter);
router.use(storageRouter);
router.use(whatsappRouter);

export default router;
