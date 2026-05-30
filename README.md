# Limited Stock Product Drop System

A full-stack **limited-stock reservation system** built to handle 100 concurrent users competing for a limited product drop — without overselling, race conditions, or data inconsistencies.

**Tech Stack:** Node.js · TypeScript · Express · Prisma · PostgreSQL · React · Vite · JWT · Zod

---

## Live Demo

| | URL |
|---|---|
|  Frontend | `https://localhost:5173` |
|  Backend API | `https://localhost:3000/api` |
|  Health Check | `https://localhost:3000/health` |

>  Replace the URLs above with your actual Pxxl deployment links before submitting.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        FRONTEND                         │
│  React + TypeScript + Vite                              │
│                                                         │
│  DropPage → useStock (poll 5s) → useCountdown (5 min)  │
│          → useReservation → useAuth (JWT)               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP REST
                     ▼
┌─────────────────────────────────────────────────────────┐
│                     BACKEND                             │
│  Express + TypeScript                                   │
│                                                         │
│  Rate Limiter → Zod Validation → JWT Auth               │
│                                                         │
│  POST /api/auth/register   POST /api/auth/login         │
│  GET  /api/products        GET  /api/products/:id       │
│  POST /api/reserve         POST /api/checkout        │
│  GET  /health              GET  /metrics                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  reservation.service.ts                         │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │  prisma.$transaction (Serializable)     │    │   │
│  │  │    SELECT ... FOR UPDATE  ← row lock    │    │   │
│  │  │    check available stock                │    │   │
│  │  │    decrement reservedStock              │    │   │
│  │  │    create Reservation                   │    │   │
│  │  │    create InventoryLog                  │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  node-cron (every 1 min) → expire reservations         │
└────────────────────┬────────────────────────────────────┘
                     │ Prisma ORM
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   PostgreSQL                            │
│  User · Product · Reservation · Order · InventoryLog   │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start — Local (Without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or use Supabase free tier)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

npm run db:generate      # generate Prisma client
npm run db:migrate:dev   # create tables
npm run db:seed          # seed test users + products
npm run dev              # start on http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # start on http://localhost:5173
```

---

## Quick Start — Docker

```bash
# Clone and start everything
git clone https://github.com/Chennadimohamedamine/Limited-Stock-Product-Drop-System.git
cd Limited-Stock-Product-Drop-System

docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Health | http://localhost:3000/health |

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/limited_drop
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## Test Credentials (after seed)

```
Email:    test@test.com
Password: password123
```

---

## API Reference

### Auth
```bash
# Register
POST /api/auth/register
{ "email": "user@example.com", "password": "password123" }

# Login
POST /api/auth/login
{ "email": "user@example.com", "password": "password123" }
# Returns: { token, user }
```

### Products
```bash
# List products (pagination + filtering + sorting)
GET /api/products?page=1&limit=10&sort=price&order=asc&minStock=1

# Single product with live available stock
GET /api/products/:id
```

### Reserve (requires JWT)
```bash
POST /api/reserve
Authorization: Bearer <token>
{ "productId": "...", "quantity": 1 }
# Returns: { reservationId, expiresAt, status }
# Reservation expires in 5 minutes
```

### Checkout (requires JWT)
```bash
POST /api/checkout
Authorization: Bearer <token>
{ "reservationId": "..." }
# Returns: { orderId, productId, quantity, createdAt }
```

### System
```bash
GET /health   # { status, uptime, timestamp }
GET /metrics  # { totalReservations, pending, expired, completed, totalOrders }
```

---

## Running Tests

```bash
cd backend
npm test
```

### What is tested:

**`reserve.test.ts`**
- Successful reservation decrements available stock
- Returns 401 without JWT token
- Returns 409 when stock is insufficient
- Returns 400 for invalid input (Zod)

**`expiry.test.ts`**
- Cannot checkout an expired reservation
- Stock is correctly restored when reservation expires

**`concurrency.test.ts`**
- 100 simultaneous requests for stock=10 → exactly 10 succeed, 90 get 409
- `reservedStock` in DB equals exactly 10 after the test
- Stock never goes negative

**Frontend (`useCountdown.test.ts` + `apiErrors.test.ts`)**
- Timer counts down correctly and sets `isExpired`
- All API error scenarios handled (race condition, timeout, network failure, expired reservation)

---

## Database Schema

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  password     String        // bcrypt hashed
  reservations Reservation[]
}

model Product {
  id            String         @id @default(cuid())
  name          String
  description   String
  totalStock    Int
  reservedStock Int            @default(0)  // ← stored, not computed
  price         Float
  reservations  Reservation[]
  orders        Order[]
  inventoryLogs InventoryLog[]
}

model Reservation {
  id        String   @id @default(cuid())
  userId    String
  productId String
  quantity  Int
  status    String   @default("PENDING")  // PENDING | COMPLETED | EXPIRED
  expiresAt DateTime                       // 5 minutes from creation
}

model Order {
  id            String   @id @default(cuid())
  reservationId String   @unique
  userId        String
  productId     String
  quantity      Int
}

model InventoryLog {
  id        String   @id @default(cuid())
  productId String
  event     String   // RESERVED | EXPIRED | PURCHASED
  delta     Int
  note      String?
}
```

---

## How Race Conditions Were Handled

### The Problem

The naive approach fails under concurrency:

```typescript
// WRONG — race condition
const product = await prisma.product.findUnique({ where: { id } });
if (product.reservedStock < product.totalStock) {
  // 100 users all pass this check simultaneously!
  await prisma.product.update({ data: { reservedStock: { increment: 1 } } });
  // Result: oversold by 90 units
}
```

When 100 users hit this simultaneously, all 100 read `reservedStock = 0` before any write commits. All 100 pass the check. All 100 decrement. Stock goes negative.

### The Fix — `FOR UPDATE` Row Lock + Serializable Transaction

```typescript
return prisma.$transaction(async (tx) => {
  // This SQL statement locks the Product row exclusively.
  // The second request to hit this line WAITS until the first
  // transaction commits or rolls back before it can proceed.
  const products = await tx.$queryRaw`
    SELECT id, "totalStock", "reservedStock"
    FROM "Product"
    WHERE id = ${productId}
    FOR UPDATE          ← the key
  `;

  const available = product.totalStock - product.reservedStock;
  if (available < quantity) throw new AppError('Insufficient stock', 409);

  // These three writes happen atomically
  await Promise.all([
    tx.reservation.create({ data: { ... } }),
    tx.product.update({ data: { reservedStock: { increment: quantity } } }),
    tx.inventoryLog.create({ data: { ... } }),
  ]);
}, { isolationLevel: 'Serializable' });
```

**Why `Serializable`?** It's the highest PostgreSQL isolation level. It guarantees transactions execute as if they were sequential — no phantom reads, no dirty reads, no write skew. Combined with `FOR UPDATE`, it is impossible for stock to go negative regardless of concurrency.

**Proof:** The concurrency test fires 100 simultaneous requests at a product with `stock=10`. Exactly 10 succeed (201), exactly 90 fail (409). The DB always shows `reservedStock = 10` after the test.

---

## Schema Decisions

### Why store `reservedStock` on Product instead of computing it?

**Option A (computed):**
```sql
SELECT totalStock - COUNT(*) FROM Reservation
WHERE productId = ? AND status = 'PENDING'
```
This requires a full aggregation scan on every single stock read. Under load with thousands of reservations this becomes a bottleneck.

**Option B (stored column — what we use):**
```sql
SELECT totalStock - reservedStock FROM Product WHERE id = ?
```
O(1) read. The column is kept in sync transactionally — it's incremented on reserve, decremented on expiry or checkout. The lock guarantees it never drifts.

### Why keep `EXPIRED` reservations instead of deleting them?

Marking as `EXPIRED` preserves the full audit trail. You can answer questions like "how many users tried to get this product" or "what was the peak reservation rate at 2pm". Deleting would lose this forever.

### Why is `Order` a separate model from `Reservation`?

A `Reservation` is a temporary hold. An `Order` is a completed commercial transaction. Keeping them separate means we can later add payment info, shipping address, invoice number etc. to `Order` without polluting the reservation flow.

### Why `InventoryLog` as append-only audit trail?

Every stock movement (RESERVED, EXPIRED, PURCHASED) writes a log row with a `delta`. You can replay the entire stock history and verify `totalStock - SUM(deltas) = currentStock`. Invaluable for debugging production issues.

---

## Trade-offs

| Decision | What we chose | Alternative | Reasoning |
|---|---|---|---|
| Concurrency control | PostgreSQL `FOR UPDATE` | Redis `DECRBY` | No extra infrastructure needed. Sufficient for this scale. |
| Real-time stock updates | Poll every 5 seconds | WebSockets / SSE | Dramatically simpler. 5s lag is acceptable for a drop page. |
| JWT storage | `sessionStorage` (in-memory) | `httpOnly` cookies | Avoids XSS. Cookies would be better for production (CSRF protection needed). |
| Reservation expiry | `node-cron` every 1 min | Redis TTL + pub/sub | No Redis dependency. Acceptable: expiry is eventually consistent within 1 min. |
| Framework | Express | NestJS | Faster to build and reason about. NestJS overhead not justified for this scope. |
| Migration in Docker | `prisma db push` | `prisma migrate deploy` | `db push` works without pre-existing migration files. Correct for first-time container deploy. |

---

## What Breaks at 10,000 Concurrent Users

1. **PostgreSQL connection pool exhaustion**
   Prisma defaults to ~10 connections. 10k concurrent requests will queue indefinitely or throw `"too many clients"`. Fix: increase `connection_limit` in `DATABASE_URL`, add PgBouncer in front.

2. **`FOR UPDATE` lock contention becomes a bottleneck**
   All 10k requests pile up waiting on the same row lock. Throughput degrades to single-threaded. Fix: replace with Redis `DECRBY` — atomic, sub-millisecond, no locks.

3. **Single-process `node-cron`**
   The expiry job runs inside the API server process. Under load it gets starved. If multiple API instances run, all of them fire the cron simultaneously causing duplicate expiry processing. Fix: BullMQ dedicated worker process with distributed locking (Redlock).

4. **No horizontal scaling**
   Single Node.js process. Fix: run multiple instances behind a load balancer. The DB lock still works (it's in Postgres), but the cron job needs the distributed lock fix above.

5. **Single-region latency**
   All reads and writes go to one Postgres instance. Fix: add read replicas for `GET /products`, route writes to primary only.

---

## How to Scale to 10k+ Users

```
[Users]
   ↓
[CDN — cache GET /products responses for 3s]
   ↓
[Load Balancer]
   ↓ ↓ ↓
[Node.js instances (horizontal)]
   ↓
[Redis]
  • DECRBY for atomic stock decrement (replaces FOR UPDATE)
  • BullMQ queue for reservation jobs
  • Pub/Sub to push stock updates to frontend (replaces polling)
  • Redlock for distributed cron coordination
   ↓
[PostgreSQL Primary]     [PostgreSQL Read Replicas × N]
  (writes only)              (GET /products reads)
   ↓
[BullMQ Worker Process]
  (expiry jobs, isolated from API)
```

**Key architectural changes:**
- **Redis `DECRBY`** — atomic stock counter, no row locking, handles 100k ops/sec
- **BullMQ reservation queue** — absorbs traffic bursts, processes sequentially
- **Read replicas** — product reads scale horizontally, primary only handles writes
- **Redis pub/sub** — stock updates pushed to clients instantly, no polling overhead
- **PgBouncer** — pools PostgreSQL connections, prevents exhaustion

---

## Project Structure

```
/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 5 models: User, Product, Reservation, Order, InventoryLog
│   │   └── seed.ts              # test users + products
│   ├── src/
│   │   ├── routes/              # auth, products, reserve, checkout, health
│   │   ├── services/            # reservation (race-safe), order, stock, auth
│   │   ├── middleware/          # JWT auth, Zod validate, rate limiter, error handler, logger
│   │   ├── jobs/                # expireReservations.ts (node-cron)
│   │   ├── validators/          # Zod schemas
│   │   └── utils/               # prisma client, logger, AppError
│   ├── tests/
│   │   ├── reserve.test.ts
│   │   ├── expiry.test.ts
│   │   └── concurrency.test.ts  # 100 concurrent users test
│   ├── Dockerfile
│   └── entrypoint.sh
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # typed axios wrappers
│   │   ├── hooks/               # useStock, useCountdown, useReservation, useAuth
│   │   ├── components/          # ProductCard, CountdownTimer, ReserveButton, AuthModal
│   │   ├── pages/               # DropPage
│   │   └── test/                # timer + API error tests
│   └── Dockerfile
│
└── docker-compose.yaml
```

---

## Security

- **JWT** on all mutating endpoints — no token = 401
- **Zod validation** on all request bodies — invalid input = 400, never reaches DB
- **Rate limiting** — 100 req/15min globally, 20 req/15min on auth endpoints
- **CORS** — restricted to `FRONTEND_URL` env variable
- **bcrypt** — passwords hashed with 10 salt rounds, never stored plain
- **No hardcoded secrets** — all sensitive values in `.env`
- **Error handler** — never exposes stack traces in production

---
