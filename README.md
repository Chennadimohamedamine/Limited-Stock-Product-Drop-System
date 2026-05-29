# Limited Stock Product Drop System

**A race-condition-safe, full-stack limited stock reservation system** designed to handle 100+ concurrent users competing for limited inventory.

Implements enterprise-grade patterns: database transactions, row-level locking, JWT authentication, real-time UI, and comprehensive error handling.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Setup

```bash
# 1. Clone repository
git clone https://github.com/Chennadimohamedamine/Limited-Stock-Product-Drop-System.git
cd Limited-Stock-Product-Drop-System

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

# 3. Database setup
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Start backend (terminal 1)
npm run dev
# Runs on http://localhost:3000

# 5. Frontend setup (terminal 2)
cd ../frontend
npm install
npm run dev
# Runs on http://localhost:5173