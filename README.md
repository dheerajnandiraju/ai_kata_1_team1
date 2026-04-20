# Office Supply Management System (OSMS)

A full-stack web app for managing office supply requests. Employees submit requests; admins manage inventory and approve/reject them.

## Stack
- **Frontend**: React 18 + Vite 5 + TypeScript + Zustand + React Hook Form + Zod
- **Backend**: Node.js 20 + Express 5 + TypeScript + Mongoose
- **Database**: MongoDB 7
- **Auth**: JWT (access token 15 min) + Refresh token (7 days, HttpOnly cookie)
- **DevOps**: Docker + docker-compose

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- MongoDB running locally or via Docker

### 1. Environment
```bash
cp .env.example .env
# Edit .env with your JWT secrets and MongoDB URI
```

### 2. Backend
```bash
cd server
npm install
npm run seed       # Creates admin user
npm run dev        # Starts on http://localhost:3001
```

### 3. Frontend
```bash
cd client
npm install
npm run dev        # Starts on http://localhost:5173
```

---

## Docker (All-in-one)
```bash
cp .env.example .env
docker-compose up --build
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Health: http://localhost:3001/api/health

---

## Default Admin Credentials
| Field | Value |
|-------|-------|
| Email | admin@company.com |
| Password | Admin@12345 |

---

## API Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health | None | Health check |
| POST | /api/auth/register | Public | Register employee |
| POST | /api/auth/login | Public | Login |
| POST | /api/auth/refresh | Cookie | Refresh access token |
| POST | /api/auth/logout | Auth | Logout |
| GET | /api/inventory | Admin | List inventory |
| POST | /api/inventory | Admin | Create item |
| PATCH | /api/inventory/:id | Admin | Update quantity |
| DELETE | /api/inventory/:id | Admin | Delete item |
| POST | /api/requests | Employee | Submit request |
| GET | /api/requests/mine | Employee | My requests |
| GET | /api/requests | Admin | All requests |
| GET | /api/requests/pending | Admin | Pending requests |
| PATCH | /api/requests/:id/approve | Admin | Approve |
| PATCH | /api/requests/:id/reject | Admin | Reject |
| GET | /api/dashboard | Auth | Stats |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| MONGODB_URI | mongodb://mongo:27017/osms | MongoDB connection |
| JWT_SECRET | — | Access token secret (required) |
| JWT_REFRESH_SECRET | — | Refresh token secret (required) |
| JWT_ACCESS_EXPIRES | 15m | Access token TTL |
| JWT_REFRESH_EXPIRES | 7d | Refresh token TTL |
| CLIENT_ORIGIN | http://localhost:5173 | CORS origin |
| PORT | 3001 | API port |
| LOW_STOCK_THRESHOLD | 5 | Low stock flag threshold |
| BCRYPT_ROUNDS | 12 | bcrypt cost |
| SEED_ADMIN_EMAIL | admin@company.com | Admin seed email |
| SEED_ADMIN_PASSWORD | Admin@12345 | Admin seed password |

---

## Testing
```bash
cd server
npm test          # Jest + Supertest integration tests
```
