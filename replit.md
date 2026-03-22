# نظام إدارة تجارة الدواجن (Poultry Trading ERP)

A full-stack Arabic RTL ERP web application for a poultry trading business (chicks and chickens).

## Architecture

### Monorepo Structure
- `artifacts/api-server/` — Express.js REST API backend (port 8080)
- `artifacts/poultry-erp/` — React + Vite frontend (port 18771, served at `/`)
- `lib/db/` — Drizzle ORM schema and DB utilities
- `lib/api-spec/` — OpenAPI YAML specification
- `lib/api-client-react/` — Generated React Query hooks + Zod schemas
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
- **Dashboard** — Finance overview with Recharts charts, KPIs (revenue, orders, customers)
- **Customers** (`/customers`) — CRUD for customer management
- **Products** (`/products`) — CRUD for products (chicks/chickens) with type, price, unit
- **Orders** (`/orders`) — Create/manage orders, assign to agents, track status
- **Agents** (`/agents`) — View and manage delivery agents

### Agent Features
- **My Orders** (`/agent/orders`) — View orders assigned to them
- **Order Detail** (`/agent/orders/:id`) — Log delivery progress

### Notifications
- Bell icon in sidebar shows unread count
- Polls every 30 seconds for new notifications

## Authentication
- JWT stored in `localStorage` as `poultry_erp_token`
- Default admin: `username=admin`, `password=admin123`
- JWT secret: `poultry-erp-secret-key-2024` (set as env var `JWT_SECRET`)

## API Endpoints
- `POST /api/auth/login` — Login, returns JWT
- `GET /api/auth/me` — Get current user
- `GET/POST /api/customers` — Customer CRUD
- `GET/POST /api/products` — Product CRUD
- `GET/POST /api/orders` — Order CRUD
- `GET/POST /api/delivery-logs` — Delivery log CRUD
- `GET /api/notifications` — List notifications
- `POST /api/notifications/read-all` — Mark all as read
- `GET /api/finance` — Finance stats with optional `from`/`to` date filters
- `GET/POST /api/users` — Agent management

## Database Schema
Tables: `users`, `customers`, `products`, `orders`, `orderItems`, `deliveryLogs`, `notifications`

## Development

### Start Development
```bash
# Start all services
pnpm run dev

# Or individually:
pnpm --filter @workspace/api-server run dev   # API on port 8080
pnpm --filter @workspace/poultry-erp run dev  # Frontend on port 18771
```

### Re-run API codegen
```bash
pnpm --filter @workspace/api-client-react run generate
```

### Seed database
```bash
pnpm --filter @workspace/scripts run seed
```

## Design
- All UI text in Arabic
- RTL layout (`dir="rtl"`)
- Fonts: Cairo (display) + Tajawal (body) from Google Fonts
- Color scheme: Emerald green primary (#10b981 range)
- Mobile-responsive sidebar that slides from the right
