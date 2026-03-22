--
-- PostgreSQL database dump
--

\restrict frKe6uBqwpOqYlf7RMGSZjTSlHTREkAAiogGmhQssc9q4xf83MBPngksBEhv2wI

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.company_settings (id, name, address, phone, commercial_reg_no, logo_url, twilio_whatsapp_from) VALUES (1, 'مزرعة الدواجن الذهبية', '', '', '', '', '+14155238886');


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.customers (id, name, phone, location, opening_balance, notes, created_at) VALUES (1, 'محمد أحمد علي', '0501234567', 'الرياض، حي النزهة', 0.00, '', '2026-03-22 17:19:16.867601');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, phone, username, password_hash, role, created_at) VALUES (1, 'المدير', NULL, 'admin', '$2a$10$XmaJlEgtAqh2usCV8KtgmusP5ZHLLf1iAto9zn7fmh5Oo3S8N/fQu', 'admin', '2026-03-22 17:13:56.074321');
INSERT INTO public.users (id, name, phone, username, password_hash, role, created_at) VALUES (2, 'مندوب التجربة', '0500000001', 'agent1', '$2b$10$TSvuisP2hXJA.Dq4XElvyeJlifEf1xBrti5CvBFHaVzfv5xi9cRI2', 'agent', '2026-03-22 22:28:32.963065');


--
-- Data for Name: customer_payments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.orders (id, customer_id, agent_id, status, order_date, delivery_date, notes, created_at) VALUES (1, 1, NULL, 'cancelled', '2026-03-22', '2026-03-23', NULL, '2026-03-22 19:37:53.070415');
INSERT INTO public.orders (id, customer_id, agent_id, status, order_date, delivery_date, notes, created_at) VALUES (5, 1, 2, 'delivered', '2026-03-22', NULL, NULL, '2026-03-22 22:29:11.915913');
INSERT INTO public.orders (id, customer_id, agent_id, status, order_date, delivery_date, notes, created_at) VALUES (6, 1, 2, 'delivered', '2026-03-22', NULL, NULL, '2026-03-22 22:29:15.739626');
INSERT INTO public.orders (id, customer_id, agent_id, status, order_date, delivery_date, notes, created_at) VALUES (7, 1, 2, 'delivering', '2026-03-22', NULL, NULL, '2026-03-22 22:29:19.450775');
INSERT INTO public.orders (id, customer_id, agent_id, status, order_date, delivery_date, notes, created_at) VALUES (8, 1, 2, 'delivering', '2026-03-22', NULL, NULL, '2026-03-22 22:29:23.103996');


--
-- Data for Name: delivery_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications (id, user_id, message, order_id, is_read, created_at) VALUES (3, 1, 'تم تحديث حالة الطلب #1 إلى جاري التجهيز', 1, true, '2026-03-22 20:12:58.222506');
INSERT INTO public.notifications (id, user_id, message, order_id, is_read, created_at) VALUES (4, 1, 'تم تحديث حالة الطلب #1 إلى ملغي', 1, true, '2026-03-22 20:12:58.420012');
INSERT INTO public.notifications (id, user_id, message, order_id, is_read, created_at) VALUES (5, 1, 'تم تحديث حالة الطلب #8 إلى جاري التجهيز', 8, false, '2026-03-22 22:36:09.49678');
INSERT INTO public.notifications (id, user_id, message, order_id, is_read, created_at) VALUES (6, 1, 'تم تحديث حالة الطلب #8 إلى جاري التوصيل', 8, false, '2026-03-22 22:36:11.056116');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products (id, name, type, unit_price, stock_quantity, description, created_at) VALUES (2, 'دجاج اختبار', 'chickens', 10.00, 2, NULL, '2026-03-22 20:04:30.099841');
INSERT INTO public.products (id, name, type, unit_price, stock_quantity, description, created_at) VALUES (1, 'دجاج طازج', 'chickens', 45.00, 0, '', '2026-03-22 17:19:52.176018');


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 1, 1, 500, 45.00);
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 5, 1, 10, 45.00);
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price) VALUES (4, 5, 2, 20, 10.00);
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price) VALUES (5, 6, 1, 5, 45.00);
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price) VALUES (6, 7, 2, 30, 10.00);
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price) VALUES (7, 8, 1, 8, 45.00);


--
-- Data for Name: whatsapp_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.whatsapp_logs (id, customer_id, order_id, message_type, status, to_phone, error_message, sent_at) VALUES (1, 1, 1, 'order_confirmation', 'failed', '+966501234567', 'Twilio not configured', '2026-03-22 21:39:27.985532');
INSERT INTO public.whatsapp_logs (id, customer_id, order_id, message_type, status, to_phone, error_message, sent_at) VALUES (2, 1, NULL, 'customer_statement', 'failed', '+966501234567', 'Twilio not configured', '2026-03-22 21:39:28.113409');


--
-- Name: company_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_settings_id_seq', 1, true);


--
-- Name: customer_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_payments_id_seq', 4, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 2, true);


--
-- Name: delivery_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.delivery_logs_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 6, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 7, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 8, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: whatsapp_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_logs_id_seq', 2, true);


--
-- PostgreSQL database dump complete
--

\unrestrict frKe6uBqwpOqYlf7RMGSZjTSlHTREkAAiogGmhQssc9q4xf83MBPngksBEhv2wI

