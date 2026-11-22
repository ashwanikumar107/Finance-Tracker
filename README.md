# Pennywise – Personal Finance Manager

A functional personal finance management application with a responsive user interface inspired by modern fintech products. Built with React 18, Node.js/Express, PostgreSQL, and Redis caching.

---

## 🌐 Live Deployments & API Documentation

- **Frontend Application (Vercel)**: [https://finance-tracker-five-eta.vercel.app](https://finance-tracker-five-eta.vercel.app)
- **Backend API (Render)**: [https://finance-tracker-cynn.onrender.com](https://finance-tracker-cynn.onrender.com)
- **Interactive Swagger API Documentation**: [https://finance-tracker-cynn.onrender.com/api/docs](https://finance-tracker-cynn.onrender.com/api/docs)
- **OpenAPI 3.0 Schema (JSON)**: [https://finance-tracker-cynn.onrender.com/api/docs.json](https://finance-tracker-cynn.onrender.com/api/docs.json)

---

## 1. Technology Stack

- **Frontend**:
  - React 18+ (Hooks: `useContext`, `useCallback`, `useMemo`, `React.lazy`, `Suspense`)
  - React Router DOM v7
  - Chart.js & `react-chartjs-2` (Bar, Doughnut, Line charts)
  - Virtual Scrolling with `react-window`
  - Lucide React Icons
  - Pure CSS3 design system (warm off-white `#F7F8F6`, dark charcoal `#202923`, emerald green `#23845B`, soft sage `#E2EAE4`)
  - Light & Dark theme support via `ThemeContext`

- **Backend**:
  - Node.js & Express.js (Modular architecture: config, controllers, services, middleware, routes, utils)
  - PostgreSQL with `pg` (parameterized queries, index optimizations, cascades, NUMERIC financial precision)
  - Resilient database engine (`pg` connection pool with embedded `pg-mem` fallback for local zero-config testing)
  - Redis caching (`ioredis` with 15-min analytics TTL, 1-hour category TTL, user-isolated cache keys, and cache invalidation hooks)
  - JWT Authentication (Access tokens + secure Refresh token rotation)
  - Three-Level Role-Based Access Control (`admin`, `user`, `read-only`)
  - Security: `helmet`, `cors`, `express-rate-limit`, `express-validator`, `bcrypt`
  - Rule-Based Smart Spending Insights engine

---

## 2. Default Seed Accounts

The database comes pre-seeded with realistic financial records (multi-month transactions, budgets, categories, and audit logs):

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pennywise.com` | `Password123!` | Complete administrative access, RBAC user role changes, delete users, access system activity logs, full transaction CRUD |
| **Standard User** | `priya@pennywise.com` | `Password123!` | Manage own transactions, set monthly budgets, create custom categories, view analytics & insights, export CSV |
| **Read-Only** | `readonly@pennywise.com` | `Password123!` | View-only dashboard, view transactions and analytics. Data mutations (add, edit, delete, export) are strictly blocked with explanatory UI cues |

---

## 3. Getting Started & Local Setup

### Prerequisites
- Node.js 18+ or 22+
- npm 9+
- (Optional) PostgreSQL and Redis servers. If neither is installed locally, the backend automatically activates embedded in-process engines (`pg-mem` and in-memory TTL cache) so the application runs immediately without external configuration.

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd "Finance Tracker"
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**:
   - `backend/.env.example` is provided and pre-configured. A working `.env` is already created.
   - `frontend/.env.example` is provided with default API proxy paths.

### Running the Application

1. **Start the Backend Server**:
   ```bash
   cd backend
   node server.js
   ```
   *The server will start on `http://localhost:5000` and automatically run the schema and seed data.*

2. **Start the Frontend Development Server** (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

---

## 4. Key Architectural Highlights

### Database Schema (`backend/schema.sql`)
- **`users`**: User identity, hashed passwords, currency, and strict role constraints (`admin`, `user`, `read-only`).
- **`categories`**: User-specific and global default categories with unique constraints per user and type.
- **`transactions`**: High-precision `NUMERIC(14, 2)` amounts, transaction dates, payment methods, indexed by `(user_id, transaction_date DESC)`.
- **`budgets`**: Monthly expense category limits with unique `(user_id, category_id, month, year)` constraint.
- **`refresh_tokens`**: SHA-256 hashed refresh tokens with expiration tracking.
- **`admin_activity_logs`**: Administrative audit trail recording IP address, target entity, action, and JSON payload.

### Security & Rate Limiting
- **Authentication Endpoints**: 5 requests per 15 minutes limit (`express-rate-limit`).
- **Transaction Endpoints**: 100 requests per hour limit.
- **Analytics Endpoints**: 50 requests per hour limit.
- **RBAC Enforcement**: Middleware strictly checks decoded JWT role against allowed permissions. Mutations by read-only users trigger `403 Forbidden`.
- **SQL Injection Prevention**: All queries use parameterized SQL `$1, $2, ...` through `pg`.

### Rule-Based Insights Engine (`backend/services/insightService.js`)
Calculates actual month-over-month percentage deltas, flags categories consuming >80% or >100% of their monthly limit, highlights primary expense drivers, and evaluates savings rate momentum without external AI dependencies.
