# نظام إدارة تجارة الدواجن (Poultry Trading ERP)

A full-stack Arabic RTL ERP web application for a poultry trading business (chicks and chickens).

## Architecture

### Monorepo Structure
- `artifacts/api-server/` — Express.js REST API backend (port 8080)
- `artifacts/poultry-erp/` — React + Vite frontend (served at `/`)
- `lib/db/` — Drizzle ORM schema and DB utilities
- `lib/api-spec/` — OpenAPI YAML specification
- `lib/api-zod/` — Generated Zod schemas from OpenAPI
- `lib/api-client-react/` — Generated React Query hooks
- `scripts/` — Seed scripts and utilities

### Tech Stack
- **Frontend**: React 18, Vite, wouter (routing), @tanstack/react-query, framer-motion, lucide-react, Recharts
- **Backend**: Express.js, TypeScript, Drizzle ORM, JWT auth (jsonwebtoken + bcryptjs)
- **Database**: PostgreSQL (via Drizzle ORM)
- **API Client**: Auto-generated from OpenAPI spec with orval

## Features

### User Roles
1. **Admin** (`/dashboard`) — Full access to all features
2. **Delivery Agent** (`/agent/orders`) — Can view their assigned orders and log deliveries

### Admin Features
- **Dashboard** — Finance overview with Recharts charts, KPIs (revenue, orders, customers), date range filter
- **Customers** (`/customers`) — CRUD for customer management
- **Products** (`/products`) — CRUD for products (chicks/chickens) with type, price, stock
- **Orders** (`/orders`) — Create/manage orders, assign to agents, track status, view detail at `/orders/:id`
- **Agents** (`/agents`) — View and manage delivery agents

### Agent Features
- **My Orders** (`/agent/orders`) — View orders assigned to them with **daily stats panel** (total/completed/remaining/collected + progress bar)
- **Order Detail** (`/agent/orders/:id`) — Log delivery progress, update status

### Dark Mode
- Toggle button in both mobile and desktop headers (Moon/Sun icon)
- Persists to `localStorage` key `poultry_erp_theme`; falls back to system `prefers-color-scheme`
- CSS variables under `.dark` class override `:root` tokens

### PWA (Progressive Web App)
- Installable on iOS and Android ("Add to Home Screen")
- Standalone mode (no browser chrome)
- Arabic app name + teal chicken-themed icons (192x192, 512x512 PNG)
- Offline fallback page at `/offline.html`
- Service worker via `vite-plugin-pwa` (autoUpdate mode) with Network-First caching for API calls
- `manifest.json` at `/public/manifest.json`; icons at `/public/icons/`

### Notifications
- Bell icon in header shows unread count badge
- Dropdown panel (desktop + mobile) lists notifications with mark-as-read
- Polls every 30 seconds for new notifications

## Authentication
- JWT stored in `localStorage` as `poultry_erp_token`
- Default admin: `username=admin`, `password=admin123`
- JWT secret configured as Replit Secret `JWT_SECRET`

## API Endpoints

All endpoints are prefixed with `/api`.

### Auth
- `POST /api/auth/login` — Login with username/password, returns JWT token
- `GET /api/auth/me` — Get current authenticated user

### Users / Agents (admin only for write)
- `GET /api/users` — List all users
- `POST /api/users` — Create user
- `GET /api/users/:id` — Get user by ID
- `PUT /api/users/:id` — Update user
- `DELETE /api/users/:id` — Delete user

### Customers (admin only for write)
- `GET /api/customers` — List all customers
- `POST /api/customers` — Create customer
- `GET /api/customers/:id` — Get customer by ID
- `PUT /api/customers/:id` — Update customer
- `DELETE /api/customers/:id` — Delete customer

### Products (admin only for write)
- `GET /api/products` — List all products
- `POST /api/products` — Create product
- `GET /api/products/:id` — Get product by ID
- `PUT /api/products/:id` — Update product
- `DELETE /api/products/:id` — Delete product

### Orders
- `GET /api/orders` — List orders (filtered by agent for agent role)
- `POST /api/orders` — Create order (admin only)
- `GET /api/orders/:id` — Get order with details
- `PUT /api/orders/:id` — Update order (admin only)
- `DELETE /api/orders/:id` — Delete order + all related data (admin only)
- `PATCH /api/orders/:id/status` — Update order status

### Delivery Logs
- `POST /api/delivery-logs` — Create delivery log (agent logs for their order)
- `GET /api/delivery-logs/:orderId` — Get logs for an order

### Notifications
- `GET /api/notifications` — List notifications for current user
- `POST /api/notifications/mark-read` — Mark notifications as read (`{ ids?: number[], all?: boolean }`)

### Customer Payments (admin only)
- `GET /api/customers/:id/payments` — List payments for a customer
- `POST /api/customers/:id/payments` — Record a payment (`{ amount, paymentDate, notes? }`)
- `DELETE /api/customers/:id/payments/:paymentId` — Delete a payment
- `GET /api/customers/:id/statement` — Full customer statement (orders + payments + running balance + summary)

### Finance (admin only)
- `GET /api/finance/summary` — Finance summary with optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` date range. Includes `totalReceivables` (all-time customer balances).

### WhatsApp (Twilio) — admin only
- `GET /api/whatsapp/config-status` — Check if TWILIO_* env vars are configured
- `POST /api/whatsapp/test-ping` — Test Twilio API connectivity
- `POST /api/whatsapp/order-confirmation/:orderId` — Send order confirmation to customer
- `POST /api/whatsapp/delivery-notice/:orderId` — Send delivery notice to customer
- `POST /api/whatsapp/customer-statement/:customerId` — Send statement summary to customer
- `GET /api/whatsapp/logs/order/:orderId` — WhatsApp log for an order
- `GET /api/whatsapp/logs/customer/:customerId` — WhatsApp log for a customer (last 20)

Required environment variables (Replit Secrets):
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` — e.g. `whatsapp:+14155238886`

## Database Schema
Tables: `users`, `customers`, `customer_payments`, `products`, `orders`, `order_items`, `order_history`, `delivery_logs`, `notifications`, `whatsapp_logs`

Indexes:
- `orders.agent_id`, `orders.status`, `orders.order_date`
- `notifications(user_id, is_read)` (composite)

## Development

### Start Development
```bash
pnpm --filter @workspace/api-server run dev   # API on port 8080
pnpm --filter @workspace/poultry-erp run dev  # Frontend
```

### Re-run API codegen
```bash
pnpm --filter @workspace/api-client-react run generate
```

### Seed database
```bash
pnpm --filter @workspace/scripts run seed
```

### Push DB schema changes
```bash
cd lib/db && pnpm drizzle-kit push
```

## Design
- All UI text in Arabic
- RTL layout (`dir="rtl"`)
- Fonts: Cairo (display) + Tajawal (body) from Google Fonts
- Color scheme: Emerald green primary (#10b981 range)
- Mobile-responsive with sliding sidebar from the right
