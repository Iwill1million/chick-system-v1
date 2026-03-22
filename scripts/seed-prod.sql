-- =========================================================
-- Production Seed Script — نظام إدارة تجارة الدواجن
-- Generated from development database
-- =========================================================

-- Disable triggers temporarily for clean insert
SET session_replication_role = replica;

-- Clear existing data (order matters for FK constraints)
TRUNCATE public.whatsapp_logs, public.notifications, public.order_items,
         public.delivery_logs, public.customer_payments, public.orders,
         public.customers, public.products, public.users,
         public.company_settings RESTART IDENTITY CASCADE;

-- ── company_settings ──────────────────────────────────────
INSERT INTO public.company_settings (id, name, address, phone, commercial_reg_no, logo_url, twilio_whatsapp_from)
VALUES (1, 'مزرعة الدواجن الذهبية', '', '', '', '', '+14155238886');

-- ── users (admin + demo agent) ────────────────────────────
-- admin   → password: admin123
-- agent1  → password: agent123
INSERT INTO public.users (id, name, phone, username, password_hash, role, created_at) VALUES
(1, 'المدير',          NULL,           'admin',  '$2a$10$XmaJlEgtAqh2usCV8KtgmusP5ZHLLf1iAto9zn7fmh5Oo3S8N/fQu', 'admin', '2026-03-22 17:13:56.074321'),
(2, 'مندوب التجربة', '0500000001',  'agent1', '$2b$10$TSvuisP2hXJA.Dq4XElvyeJlifEf1xBrti5CvBFHaVzfv5xi9cRI2', 'agent', '2026-03-22 22:28:32.963065');

-- ── customers ─────────────────────────────────────────────
INSERT INTO public.customers (id, name, phone, location, opening_balance, notes, created_at) VALUES
(1, 'محمد أحمد علي', '0501234567', 'الرياض، حي النزهة', 0.00, '', '2026-03-22 17:19:16.867601');

-- ── products ──────────────────────────────────────────────
INSERT INTO public.products (id, name, type, unit_price, stock_quantity, description, created_at) VALUES
(1, 'دجاج طازج',    'chickens', 45.00, 100, '', '2026-03-22 17:19:52.176018'),
(2, 'دجاج اختبار', 'chickens', 10.00, 50,  NULL,'2026-03-22 20:04:30.099841');

-- ── orders ────────────────────────────────────────────────
INSERT INTO public.orders (id, customer_id, agent_id, status, order_date, delivery_date, notes, created_at) VALUES
(1, 1, NULL, 'cancelled',   '2026-03-22', '2026-03-23', NULL, '2026-03-22 19:37:53.070415'),
(5, 1, 2,    'delivered',   '2026-03-22',  NULL,         NULL, '2026-03-22 22:29:11.915913'),
(6, 1, 2,    'delivered',   '2026-03-22',  NULL,         NULL, '2026-03-22 22:29:15.739626'),
(7, 1, 2,    'delivering',  '2026-03-22',  NULL,         NULL, '2026-03-22 22:29:19.450775'),
(8, 1, 2,    'delivering',  '2026-03-22',  NULL,         NULL, '2026-03-22 22:29:23.103996');

-- ── order_items ───────────────────────────────────────────
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 500, 45.00),
(3, 5, 1,  10, 45.00),
(4, 5, 2,  20, 10.00),
(5, 6, 1,   5, 45.00),
(6, 7, 2,  30, 10.00),
(7, 8, 1,   8, 45.00);

-- ── Reset all sequences ───────────────────────────────────
SELECT setval('public.users_id_seq',            (SELECT MAX(id) FROM public.users));
SELECT setval('public.customers_id_seq',        (SELECT MAX(id) FROM public.customers));
SELECT setval('public.products_id_seq',         (SELECT MAX(id) FROM public.products));
SELECT setval('public.orders_id_seq',           (SELECT MAX(id) FROM public.orders));
SELECT setval('public.order_items_id_seq',      (SELECT MAX(id) FROM public.order_items));
SELECT setval('public.company_settings_id_seq', (SELECT MAX(id) FROM public.company_settings));
SELECT setval('public.notifications_id_seq',    1, false);
SELECT setval('public.delivery_logs_id_seq',    1, false);
SELECT setval('public.customer_payments_id_seq',1, false);
SELECT setval('public.whatsapp_logs_id_seq',    1, false);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Done
SELECT 'Seed complete ✓' AS status;
