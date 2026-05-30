# System Architecture & Code Explanation

## 1. FULL SYSTEM FLOW

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (USER)                                      │
│  100 users trying to reserve limited product at exactly the same time        │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │ HTTP
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + TypeScript)                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ DropPage Component                                                 │    │
│  │                                                                    │    │
│  │  useAuth()              → stores JWT token in sessionStorage       │    │
│  │  useStock()             → polls GET /api/products/:id every 5s     │    │
│  │  useReservation()       → state machine: idle→loading→reserved     │    │
│  │  useCountdown()         → 5-minute timer (MM:SS format)            │    │
│  │                                                                    │    │
│  │  UI Components:                                                    │    │
│  │  - ProductCard          → shows product + stock badge             │    │
│  │  - ReserveButton        → disabled if sold out / already reserved │    │
│  │  - CountdownTimer       → visual timer with urgent mode (<60s)     │    │
│  │  - AuthModal            → login/register form                      │    │
│  │  - Toast                → error/success notifications              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  API Layer (axios interceptors):                                            │
│  - Automatically attach JWT token to all requests                           │
│  - Normalize error responses (409 = race condition, 401 = auth required)    │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │ REST HTTP + JWT
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express + TypeScript)                            │
│                                                                              │
│  Request comes in → MIDDLEWARE PIPELINE:                                    │
│                                                                              │
│  1. CORS + JSON parser                                                      │
│  2. Rate Limiter (100 req/15min per IP, 20/15min for auth)                 │
│  3. Request Logger (Winston - structured JSON logs)                         │
│  4. Route matching                                                          │
│  5. JWT Authenticate middleware (if protected route)                        │
│  6. Zod Validation (if has body)                                            │
│  7. Route handler → Service → Database                                      │
│  8. Error Handler (catches all errors, no stack traces)                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ROUTE: POST /api/auth/register                                      │   │
│  │ ├─ validate: Zod (email format, password min 8)                     │   │
│  │ ├─ service: auth.service.register()                                 │   │
│  │ │  └─ bcrypt.hash(password, 10)                                     │   │
│  │ │  └─ prisma.user.create()                                          │   │
│  │ │  └─ jwt.sign({ userId, email }, JWT_SECRET)                      │   │
│  │ └─ return: { token, user }                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ROUTE: POST /api/reserve  (protected)                            │   │
│  │ ├─ authenticate: check JWT token → get userId                      │   │
│  │ ├─ validate: Zod (productId required, quantity 1-10)                │   │
│  │ ├─ service: reservation.service.createReservation()                │   │
│  │ │                                                                    │   │
│  │ │  THIS IS THE RACE CONDITION FIX:                                 │   │
│  │ │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │ │  │ prisma.$transaction(..., isolationLevel: 'Serializable') │   │   │
│  │ │  │                                                           │   │   │
│  │ │  │  STEP 1: Row-level lock                                 │   │   │
│  │ │  │  await tx.$queryRaw`                                    │   │   │
│  │ │  │    SELECT * FROM "Product"                              │   │   │
│  │ │  │    WHERE id = ${productId}                              │   │   │
│  │ │  │    FOR UPDATE  ← LOCK THIS ROW EXCLUSIVELY              │   │   │
│  │ │  │  `                                                      │   │   │
│  │ │  │                                                           │   │   │
│  │ │  │  STEP 2: Check availability (no other transaction can    │   │   │
│  │ │  │          read this row until we're done)                │   │   │
│  │ │  │  available = product.totalStock - product.reservedStock │   │   │
│  │ │  │  if (available < quantity) throw 409 "Insufficient"     │   │   │
│  │ │  │                                                           │   │   │
│  │ │  │  STEP 3: All three writes happen atomically             │   │   │
│  │ │  │  Promise.all([                                           │   │   │
│  │ │  │    tx.reservation.create({                              │   │   │
│  │ │  │      userId, productId, quantity,                       │   │   │
│  │ │  │      status: 'PENDING',                                 │   │   │
│  │ │  │      expiresAt: now + 5 minutes                         │   │   │
│  │ │  │    }),                                                  │   │   │
│  │ │  │    tx.product.update({                                  │   │   │
│  │ │  │      reservedStock: { increment: quantity }             │   │   │
│  │ │  │    }),                                                  │   │   │
│  │ │  │    tx.inventoryLog.create({                             │   │   │
│  │ │  │      event: 'RESERVED', delta: -quantity                │   │   │
│  │ │  │    })                                                   │   │   │
│  │ │  │  ])                                                     │   │   │
│  │ │  │                                                           │   │   │
│  │ │  │  WHY THIS WORKS:                                         │   │   │
│  │ │  │  • FOR UPDATE: user 2 waits while user 1 is executing   │   │   │
│  │ │  │  • Serializable: guarantees no phantom reads             │   │   │
│  │ │  │  • All writes are atomic: all succeed or all fail        │   │   │
│  │ │  │  • Stock CANNOT go negative                              │   │   │
│  │ │  └──────────────────────────────────────────────────────────┘   │   │
│  │ │                                                                    │   │
│  │ └─ return: { reservationId, expiresAt, status: 'PENDING' }         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ROUTE: POST /api/checkout  (protected)                          │   │
│  │ ├─ authenticate: check JWT                                         │   │
│  │ ├─ validate: Zod (reservationId required)                          │   │
│  │ ├─ service: order.service.checkout()                               │   │
│  │ │  └─ Find reservation by ID (must belong to current user)        │   │
│  │ │  └─ Check status is 'PENDING' and not expired                   │   │
│  │ │  └─ Create Order                                                 │   │
│  │ │  └─ Update Reservation status → 'COMPLETED'                     │   │
│  │ │  └─ Decrement both totalStock and reservedStock                 │   │
│  │ │  └─ Log 'PURCHASED' event                                        │   │
│  │ └─ return: { orderId, productId, quantity }                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ROUTE: GET /api/products/:id                                       │   │
│  │ ├─ service: stock.service.getProductById()                         │   │
│  │ │  └─ SELECT product from DB                                       │   │
│  │ │  └─ Calculate availableStock = totalStock - reservedStock        │   │
│  │ │  └─ Return enriched product                                      │   │
│  │ └─ Frontend polls this every 5 seconds to show live stock          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CRON JOB: expireReservations.ts (runs every 1 minute)              │   │
│  │ ├─ Find all PENDING reservations where expiresAt < now             │   │
│  │ ├─ For each expired reservation:                                   │   │
│  │ │  ├─ Update status → 'EXPIRED'                                    │   │
│  │ │  ├─ Decrement reservedStock (release back to available)          │   │
│  │ │  ├─ Log 'EXPIRED' event                                          │   │
│  │ ├─ All updates in single transaction (atomic)                      │   │
│  │ └─ Winston logs: "Reservations expired: 5 reservations"            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │ Prisma ORM (type-safe queries)
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database                                    │
│                                                                              │
│  TABLE: User                                                                │
│  ├─ id (UUID)                                                              │
│  ├─ email (UNIQUE)                                                         │
│  ├─ password (bcrypt hashed)                                               │
│                                                                              │
│  TABLE: Product                                                             │
│  ├─ id (UUID)                                                              │
│  ├─ name, description, price                                               │
│  ├─ totalStock (int) — never changes                                       │
│  ├─ reservedStock (int) — ← incremented on reserve, decremented on expiry  │
│  │     THIS IS THE KEY: computed in real-time as totalStock - reservedStock│
│  │                                                                          │
│  TABLE: Reservation                                                         │
│  ├─ id (UUID)                                                              │
│  ├─ userId, productId, quantity                                            │
│  ├─ status: 'PENDING' | 'COMPLETED' | 'EXPIRED'                           │
│  ├─ expiresAt (timestamp, 5 minutes from creation)                        │
│  │     Cron job checks this every 1 min to find expiries                   │
│  │                                                                          │
│  TABLE: Order                                                               │
│  ├─ id (UUID)                                                              │
│  ├─ reservationId (UNIQUE FK) — one order per reservation                 │
│  ├─ userId, productId, quantity, createdAt                                 │
│  │     Created when checkout succeeds                                      │
│  │                                                                          │
│  TABLE: InventoryLog (append-only audit trail)                             │
│  ├─ id (UUID)                                                              │
│  ├─ productId (FK)                                                         │
│  ├─ event: 'RESERVED' | 'EXPIRED' | 'PURCHASED'                           │
│  ├─ delta (int, can be positive or negative)                              │
│  ├─ note (text, for debugging)                                             │
│  ├─ createdAt (timestamp)                                                  │
│  │     AUDIT TRAIL: sum all deltas should equal final stock change         │
│  │                                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. RACE CONDITION VISUALIZATION

### Without FOR UPDATE (crashes with concurrency)

```
Time │ User 1                      │ User 2
─────┼─────────────────────────────┼──────────────────────
  0  │ SELECT stock = 10           │
     │                              │ SELECT stock = 10 ← same value!
  1  │ if (10 >= 1) ✓              │ if (10 >= 1) ✓
     │                              │
  2  │ stock = 10 - 1 = 9          │
     │ UPDATE stock = 9             │
  3  │ COMMIT                       │ stock = 10 - 1 = 9
     │                              │ UPDATE stock = 9
  4  │ final stock = 9             │ COMMIT
     │                              │ final stock = 9
     │                              │
     │ RESULT: Both users decremented!
     │ Stock: 9 (should be 8)
     │ If 10 users hit simultaneously:
     │ stock = 10 - 10 = 0 ← OVERSOLD
```

### With FOR UPDATE (correct)

```
Time │ User 1                                  │ User 2
─────┼─────────────────────────────────────────┼──────────────────
  0  │ BEGIN TRANSACTION                       │
     │ SELECT stock FROM Product               │
     │   WHERE id = X FOR UPDATE ← LOCK        │
     │ stock = 10                              │
     │ if (10 >= 1) ✓                         │ BEGIN (waits for lock)
  1  │ stock = 10 - 1 = 9                     │ BLOCKED...
     │ UPDATE stock = 9                        │ BLOCKED...
  2  │ COMMIT ← RELEASE LOCK                  │
     │                                         │ NOW READS stock = 9
     │                                         │ if (9 >= 1) ✓
  3  │ final stock = 9                        │ stock = 9 - 1 = 8
     │                                         │ UPDATE stock = 8
  4  │                                         │ COMMIT
     │                                         │ final stock = 8
     │
     │ RESULT: Only one decremented per transaction
     │ Stock = 8 (CORRECT)
     │ If 10 users: stock = 0, not negative
```

---

## 3. DATA FLOW: Complete User Journey

```
STEP 1: USER LOGS IN
┌─────────────────────────────────────────┐
│ Frontend: AuthModal                     │
│ User enters: email + password           │
└──────────────┬──────────────────────────┘
               │ POST /api/auth/login
               ▼
┌─────────────────────────────────────────┐
│ Backend: auth.service.login()           │
│ 1. Find user by email                   │
│ 2. bcrypt.compare(password, hashed)     │
│ 3. jwt.sign({ userId, email })          │
│ 4. Return token                         │
└──────────────┬──────────────────────────┘
               │ { token, user }
               ▼
┌─────────────────────────────────────────┐
│ Frontend: useAuth hook                  │
│ sessionStorage.setItem('token', ...)    │
│ Now every API request includes:         │
│ Authorization: Bearer <token>           │
└─────────────────────────────────────────┘

───────────────────────────────────────────

STEP 2: PRODUCT PAGE LOADS
┌─────────────────────────────────────────┐
│ Frontend: DropPage                      │
│ useStock(productId) starts              │
│ Polls GET /api/products/:id every 5s    │
└──────────────┬──────────────────────────┘
               │ GET /api/products/:id
               ▼
┌─────────────────────────────────────────┐
│ Backend: stock.service.getProductById() │
│ SELECT product WHERE id = ?             │
│ Calculate available = total - reserved  │
│ Return product object                   │
└──────────────┬──────────────────────────┘
               │ { id, name, price, totalStock, 
               │   reservedStock, availableStock }
               ▼
┌─────────────────────────────────────────┐
│ Frontend: ProductCard renders           │
│ Shows: name, price, stock badge         │
│ StockBadge shows: 8 / 10 available      │
│ ReserveButton enabled (stock > 0)       │
└─────────────────────────────────────────┘

───────────────────────────────────────────

STEP 3: USER CLICKS RESERVE
┌─────────────────────────────────────────┐
│ Frontend: ReserveButton clicked         │
│ useReservation.makeReservation() called │
│ Status: idle → loading                  │
└──────────────┬──────────────────────────┘
               │ POST /api/reserve
               │ Authorization: Bearer <token>
               │ { productId: "...", quantity: 1 }
               ▼
┌──────────────────────────────────────────────────────┐
│ Backend: reservation.service.createReservation()     │
│                                                      │
│ BEGIN TRANSACTION (Serializable isolation)          │
│                                                      │
│ 1. SELECT * FROM Product WHERE id = ? FOR UPDATE    │
│    └─ ROW LOCK acquired (waits if other transaction) │
│                                                      │
│ 2. available = 8 - 0 = 8                             │
│    if (8 >= 1) ✓ proceed                             │
│                                                      │
│ 3. INSERT INTO Reservation (...)                     │
│    UPDATE Product SET reservedStock = 1              │
│    INSERT INTO InventoryLog (RESERVED, -1)          │
│                                                      │
│ COMMIT                                               │
│ └─ RELEASE row lock                                  │
└──────────────┬───────────────────────────────────────┘
               │ { reservationId, expiresAt, status }
               │ expiresAt = now + 5 minutes
               ▼
┌─────────────────────────────────────────┐
│ Frontend: useReservation state           │
│ Status: reserved                        │
│ Show: CountdownTimer + "Checkout" btn   │
│ useCountdown() starts 5-min timer       │
│ CountdownTimer displays: 05:00 → 04:59  │
└─────────────────────────────────────────┘

───────────────────────────────────────────

STEP 4A: USER CHECKS OUT WITHIN 5 MIN
┌─────────────────────────────────────────┐
│ Frontend: CountdownTimer still running  │
│ User clicks "Complete Purchase"         │
│ useReservation.completeCheckout() called│
└──────────────┬──────────────────────────┘
               │ POST /api/checkout
               │ { reservationId: "..." }
               ▼
┌──────────────────────────────────────────────────────┐
│ Backend: order.service.checkout()                    │
│                                                      │
│ 1. Find Reservation by ID                           │
│ 2. Check: status = 'PENDING' AND expiresAt > now ✓ │
│ 3. CREATE Order                                      │
│ 4. UPDATE Reservation status = 'COMPLETED'          │
│ 5. DECREMENT totalStock & reservedStock (sold now)  │
│ 6. INSERT InventoryLog (PURCHASED, -1)              │
│                                                      │
│ COMMIT                                               │
└──────────────┬───────────────────────────────────────┘
               │ { orderId, productId, quantity }
               ▼
┌─────────────────────────────────────────┐
│ Frontend: useReservation state           │
│ Status: completed                       │
│ Show: "✓ Order confirmed #abc123"       │
│ Toast: "Purchase complete! "          │
└─────────────────────────────────────────┘

───────────────────────────────────────────

STEP 4B: TIMEOUT (Reservation expires after 5 min)
┌─────────────────────────────────────────┐
│ Frontend: CountdownTimer                │
│ Countdown reaches 00:00                 │
│ onExpired() callback fires              │
│ useReservation.markExpired() called     │
└──────────────┬──────────────────────────┘
               │ Backend cron job (every 1 min)
               │ finds expired reservations
               ▼
┌──────────────────────────────────────────────────────┐
│ Backend: expireReservations job (node-cron)          │
│                                                      │
│ SELECT * FROM Reservation                           │
│ WHERE status = 'PENDING' AND expiresAt < now       │
│                                                      │
│ For each expired:                                    │
│   UPDATE Reservation status = 'EXPIRED'              │
│   DECREMENT Product.reservedStock (release back)    │
│   INSERT InventoryLog (EXPIRED, +quantity)          │
│                                                      │
│ All in single transaction (atomic)                  │
│ Log: "Reservations expired: 1 item"                 │
└──────────────┬───────────────────────────────────────┘
               │ (propagates to frontend on next poll)
               ▼
┌─────────────────────────────────────────┐
│ Frontend: useStock polls next            │
│ Product.reservedStock back to 0         │
│ availableStock = 10 - 0 = 10            │
│ Status: expired message shown           │
│ Stock released: available again         │
└─────────────────────────────────────────┘
```

---

## 4. KEY CODE LOCATIONS

| What | File | Line |
|---|---|---|
| **Race condition fix** | `src/services/reservation.service.ts` | Line ~30-60 |
| **Row lock** | `src/services/reservation.service.ts` | Line ~35 (`FOR UPDATE`) |
| **Serializable isolation** | `src/services/reservation.service.ts` | Line ~80 |
| **Checkout validation** | `src/services/order.service.ts` | Line ~15-25 |
| **Cron job** | `src/jobs/expireReservations.ts` | Full file |
| **JWT auth** | `src/middleware/authenticate.ts` | Full file |
| **Zod validation** | `src/validators/reserve.schema.ts` | Full file |
| **Rate limiter** | `src/middleware/rateLimiter.ts` | Full file |
| **Error handler** | `src/middleware/errorHandler.ts` | Full file |
| **Frontend polling** | `frontend/src/hooks/useStock.ts` | Line ~10-20 |
| **Frontend countdown** | `frontend/src/hooks/useCountdown.ts` | Line ~15-30 |
| **Concurrency test** | `tests/concurrency.test.ts` | Line ~40-80 |

---

## 5. WHAT EACH COMPONENT DOES

### Backend Services

**auth.service.ts**
- `register(email, password)` → bcrypt hash + create user + return JWT
- `login(email, password)` → bcrypt compare + verify + return JWT

**reservation.service.ts** (the critical one)
- `createReservation(userId, productId, quantity)` → **FOR UPDATE lock + Serializable transaction** + atomic writes

**order.service.ts**
- `checkout(reservationId, userId)` → validate not expired + create order + mark completed

**stock.service.ts**
- `getProductById(id)` → return product with calculated available stock
- `listProducts(query)` → pagination + filtering + sorting

### Frontend Hooks

**useAuth**
- State: `{ token, user }`
- Methods: `login()`, `register()`, `logout()`
- Storage: sessionStorage (in-memory, cleared on page refresh)

**useStock**
- Polls every 5 seconds
- Returns: `{ product, isLoading, error, refetch() }`
- Keeps product data fresh on frontend

**useCountdown**
- Accepts: `expiresAt` timestamp
- Returns: `{ secondsLeft, isExpired, formatted (MM:SS) }`
- Used by CountdownTimer component

**useReservation**
- State machine: `idle` → `loading` → `reserved` → `completed/expired/error`
- Methods: `makeReservation()`, `completeCheckout()`, `markExpired()`, `reset()`
- Prevents duplicate reservation attempts

### Frontend Components

**ProductCard**
- Shows product info + stock badge
- Displays countdown when reserved
- Shows error/expired states
- Handles all edge cases

**ReserveButton**
- Disabled when sold out or already reserved
- Shows loading spinner while pending
- Changes text based on state

**CountdownTimer**
- Visual 5-minute countdown (MM:SS)
- Changes color to orange when <1 minute
- Fires `onExpired` callback when done

**AuthModal**
- Login vs Register toggle
- Email + password fields
- Error display + loading state

---

## 6. ERROR HANDLING FLOW

```
User attempts to reserve
    ↓
┌─────────────────────────────────────────┐
│ Check: Is JWT token present? (401)      │
│ Check: Is body valid? (400 Zod error)   │
│ Check: Is product ID real? (404)        │
│ Check: Is stock available? (409)        │
│ Check: Is user already reserved? (409)  │
│ Check: Did DB write fail? (500)         │
└─────────────────────────────────────────┘
         ↓ if any fails:
    Error Handler middleware
         ↓
    Format JSON response
    Log to Winston (structured)
    Send to frontend
         ↓
    Frontend receives error
    Toast notification pops up
    useReservation.status = 'error'
    User can try again
```
