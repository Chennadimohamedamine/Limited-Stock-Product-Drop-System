# Limited Drop System — Backend

A race-condition-safe limited stock reservation API built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

---

## Quick Start

```bash
# 1. Clone and install
cd backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 3. Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# 4. Seed the database (creates test users + products)
npm run db:seed

# 5. Start development server
npm run dev
```

Server runs on `http://localhost:3000`

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT token |
| GET | `/api/products` | No | List products (pagination, sort, filter) |
| GET | `/api/products/:id` | No | Get single product with available stock |
| POST | `/api/reserve` | JWT | Reserve a product |
| GET | `/api/reserve/:id` | JWT | Get reservation status |
| POST | `/api/checkout` | JWT | Complete purchase |
| GET | `/health` | No | Health check |
| GET | `/metrics` | No | System metrics |

### Query params for `GET /api/products`
- `page` (default: 1)
- `limit` (default: 10, max: 50)
- `sort` — field name: `name`, `price`, `totalStock`, `createdAt`
- `order` — `asc` or `desc`
- `minStock` — filter out products below this available stock

---

## Test Credentials (after seed)

```
Email:    test@test.com
Password: password123
```

---

## Running Tests

```bash
npm test                  # all tests
npm run test:coverage     # with coverage report
```

Tests cover:
- Reservation creation and stock decrement
- Auth protection (401 without token)
- Input validation (400 for bad input)
- Expired reservation cannot be checked out
- Stock restoration on expiry
- **Concurrency: 100 simultaneous requests for stock=10 → exactly 10 succeed**

---

## Architecture Decisions

### 1. How Race Conditions Were Handled

The naive approach fails:

```typescript
// WRONG — race condition here
const product = await prisma.product.findUnique({ where: { id } });
if (product.availableStock >= quantity) {
  await prisma.product.update(...); // Two threads can both pass this check!
}
```

Between the `findUnique` and the `update`, another request can read the same stock value. If 100 users all read "10 available" simultaneously, all 100 will try to decrement — overselling by 90 units.

**The fix: `FOR UPDATE` row-level lock inside a Serializable transaction.**

```typescript
return prisma.$transaction(async (tx) => {
  // This line locks the Product row exclusively.
  // Any other transaction attempting FOR UPDATE on the same row will WAIT
  // until this transaction commits or rolls back.
  const products = await tx.$queryRaw`
    SELECT * FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  // ... safe to check and decrement now
}, { isolationLevel: 'Serializable' });
```

`Serializable` isolation means the database guarantees transactions execute as if they were sequential, even when they run concurrently. Combined with `FOR UPDATE`, stock can never go negative.

---

### 2. Schema Decisions

**`reservedStock` stored on Product (not computed)**

We could compute available stock as `totalStock - COUNT(pending reservations)`, but that requires an aggregation query on every read. With high concurrent traffic, this becomes a bottleneck. Storing `reservedStock` as a column makes reads O(1) and keeps the hot path fast.

**`status` field on Reservation**

Rather than deleting expired reservations, we mark them `EXPIRED`. This gives us a full audit trail and lets us quickly query "how many reservations did this user ever make". Deletion would lose this history.

**`InventoryLog` as append-only audit trail**

Every stock change (RESERVED, EXPIRED, PURCHASED) writes a log entry with a delta. This makes it trivial to replay the history and verify the final stock count is correct. It's also invaluable for debugging discrepancies.

**`Order` as a separate model (not just a flag on Reservation)**

Orders represent a completed commercial transaction. Keeping them separate from Reservations means we can add order-specific fields (payment info, shipping address) later without polluting the Reservation model.

---

### 3. Trade-offs

| Decision | Chose | Alternative | Why |
|----------|-------|-------------|-----|
| Locking strategy | DB-level `FOR UPDATE` | Redis atomic `DECRBY` | Simpler setup, no extra infra, sufficient at this scale |
| Real-time stock | Poll every 5s | WebSockets / SSE | Much simpler, acceptable UX for a drop page |
| Token storage | In-memory (React state) | localStorage / httpOnly cookies | No XSS risk; httpOnly cookies would be better for production |
| Expiry mechanism | node-cron (1-min interval) | Redis TTL + pub/sub | No Redis dependency; at most 1 min delay on expiry is acceptable |
| Framework | Express | NestJS | Faster to build, easier to reason about for this scope |

---

### 4. What Breaks at 10,000 Concurrent Users

1. **PostgreSQL connection pool exhaustion** — Prisma's default pool is ~10 connections. 10k concurrent requests will queue or fail. Fix: increase pool size, add PgBouncer.

2. **Single-process node-cron** — The expiry job runs in the same process as the API. Under high load, it can be starved. Fix: move to a dedicated worker process or BullMQ job queue.

3. **`FOR UPDATE` lock contention** — At extreme concurrency, all threads pile up waiting on the same row lock. Throughput degrades linearly. Fix: Redis atomic counter (`DECRBY`) bypasses row locking entirely.

4. **No horizontal scaling** — Row-level locking only works within a single DB. If you run multiple Node instances, the lock still works (it's in Postgres), but the cron job would fire on all instances simultaneously — causing duplicate expiry processing. Fix: distributed lock (Redlock) or a single job runner.

5. **Single-region latency** — All reads and writes hit one PostgreSQL instance. Fix: read replicas for `GET /products`, primary only for writes.

---

### 5. How to Scale to 10k+ Users

```
[Users] → [CDN / Edge Cache for product reads]
              ↓
         [Load Balancer]
              ↓
    [Node.js Cluster (multiple instances)]
              ↓
    ┌─────────────────────────────┐
    │  Redis                      │
    │  • Stock counter (DECRBY)   │
    │  • Reservation queue        │
    │  • Pub/Sub for stock events │
    └─────────────────────────────┘
              ↓
    [PostgreSQL Primary + Read Replicas]
              ↓
    [BullMQ Worker — processes expiry jobs]
```

Key changes:
- **Redis `DECRBY`** for atomic stock decrement — no DB lock needed, sub-millisecond
- **BullMQ** for reservation queue — absorb burst traffic, process sequentially
- **Read replicas** — all `GET /products` reads hit replicas, writes go to primary
- **Redis pub/sub** — push stock updates to frontend instead of polling
- **PgBouncer** — connection pooling layer in front of PostgreSQL
