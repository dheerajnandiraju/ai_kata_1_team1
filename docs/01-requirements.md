# Requirements

## Problem Statement

Office staff currently have no structured way to request, track, or manage office supplies. Admins lack visibility into what has been requested, what is in stock, and whether requests have been fulfilled. This system provides a lightweight web application where employees can submit supply requests and admins can manage inventory and approve or reject those requests.

## Target Platform / Scale / Users

- **Platform**: Web application (browser-based, responsive)
- **Users**: Small to mid-size office teams (up to ~200 users)
- **Roles**: Admin, Employee
- **Tech Stack**: React 18 + Vite 5 (frontend) · Node.js 20 + Express 5 (backend REST API) · MongoDB 7 + Mongoose (database)
- **Auth**: JWT access tokens (15 min) + refresh tokens (7 days, HttpOnly cookie)

## Scope

### In Scope
- Employee supply request submission (item name, quantity, optional remarks)
- Admin inventory view **and management** (add items, update quantities)
- Admin approval / rejection of pending requests (with optional rejection reason)
- Automatic inventory deduction on approval (MongoDB atomic update)
- Full request history with status tracking, search, and status/date filter
- Role-based access (Admin vs. Employee views)
- JWT-based authentication with refresh-token rotation
- Dashboard summary statistics for both roles
- Low-stock alerts for Admin (configurable threshold)
- Audit trail (who approved/rejected and when)
- Toast/snackbar notifications for key actions

### Out of Scope
- Email / push notifications (v2)
- Multi-warehouse / multi-location inventory
- Purchase order generation
- Mobile native app
- Real-time WebSocket push (polling acceptable for MVP)

---

## Functional Requirements

| ID    | Requirement |
|-------|-------------|
| FR-01 | The system shall support two user roles: **Admin** and **Employee**. |
| FR-02 | Users shall be able to register (Employee role) and log in with email + password; JWTs are issued on success with refresh-token rotation. |
| FR-03 | An **Employee** shall be able to submit a supply request containing: item name (required), quantity (required, positive integer), and remarks (optional text). |
| FR-04 | An **Employee** shall be able to view the history of their own submitted requests and their current status (Pending / Approved / Rejected). |
| FR-05 | An **Admin** shall be able to view the current inventory list (item name, quantity, low-stock flag). |
| FR-06 | An **Admin** shall be able to add new inventory items and update existing item quantities. |
| FR-07 | An **Admin** shall be able to view all pending supply requests from all employees. |
| FR-08 | An **Admin** shall be able to approve a pending request; upon approval the inventory quantity for that item shall be decremented atomically by the requested quantity. |
| FR-09 | An **Admin** shall be able to reject a pending request with an optional rejection reason. |
| FR-10 | Rejected requests shall be stored with an optional rejection reason visible in the request history. |
| FR-11 | The system shall maintain a complete history of all requests (all employees) accessible to the Admin, showing status, timestamps, actioned-by user, and rejection reasons. |
| FR-12 | Approving a request for an item that does not yet exist in inventory shall create that inventory entry (quantity = 0 − requested, floored at 0, flagged as low-stock). |
| FR-13 | Both Admin and Employee dashboards shall display summary statistics (total / pending / approved / rejected counts; Admin also sees inventory count and low-stock item count). |
| FR-14 | Request history shall be searchable by item name and filterable by status and date range (client-side query params forwarded to API). |
| FR-15 | The UI shall display toast/snackbar notifications on: successful request submit, approval, rejection, and inventory update. |

---

## Non-Functional Requirements

| ID     | Requirement |
|--------|-------------|
| NFR-01 | The UI must be simple, clear, and navigable without training. |
| NFR-02 | All API endpoints (except `/api/auth/*`) shall require a valid JWT access token; roles enforced at middleware layer. |
| NFR-03 | Passwords shall be stored hashed (bcrypt, cost factor ≥ 12). |
| NFR-04 | The application shall respond to API requests within 500 ms (p95) under normal load. |
| NFR-05 | The application shall be containerised via Docker + docker-compose for development/staging. |
| NFR-06 | The codebase shall include unit tests for core business logic and integration tests for API routes (≥ 80 % coverage on src/services). |
| NFR-07 | CORS shall be restricted to the configured frontend origin; HTTP security headers shall be applied via `helmet`. |
| NFR-08 | Concurrent request approvals shall not double-deduct inventory (MongoDB atomic `findOneAndUpdate` with `$inc`). |
| NFR-09 | Input validation shall be performed on both client (React Hook Form + Zod) and server (express-validator). |

---

## Acceptance Criteria

| ID    | Linked FR/NFR | Criterion |
|-------|---------------|-----------|
| AC-01 | FR-01, FR-02   | A new user registers as Employee; seeded admin logs in. Login returns JWT access token; invalid credentials return HTTP 401. |
| AC-02 | FR-03          | Authenticated Employee POSTs a supply request; response is 201 with `status: "pending"`. |
| AC-03 | FR-04          | Employee history endpoint returns only that employee's requests with correct statuses. |
| AC-04 | FR-05, FR-06   | Admin can GET inventory list and PATCH item quantity; change persists in subsequent GET. |
| AC-05 | FR-07          | Admin pending-requests endpoint returns only `pending` records. |
| AC-06 | FR-08          | Admin approves request → status `approved`, inventory decremented atomically, audit record created. |
| AC-07 | FR-09, FR-10   | Admin rejects with reason → status `rejected`, reason stored, inventory unchanged. |
| AC-08 | FR-11          | Admin history endpoint returns all requests; approved/rejected records include `actionedBy` and timestamp. |
| AC-09 | FR-13          | Dashboard API returns correct aggregated counts; UI renders without error. |
| AC-10 | FR-14          | Filtering by `status=approved` returns only approved records; item-name search filters correctly. |
| AC-11 | FR-15          | Submitting a request in the UI shows a success toast; request appears in Employee history. |
| AC-12 | NFR-02         | Protected route without token → 401; admin-only route called as Employee → 403. |
| AC-13 | NFR-03         | Stored password field begins with `$2b$` (bcrypt hash). |
| AC-14 | NFR-08         | Concurrent approval of the same request deducts inventory exactly once. |

---

## Testability Notes

| AC    | How to Test |
|-------|-------------|
| AC-01 | Integration: POST `/api/auth/register` + `/api/auth/login`; assert JWT issued, invalid creds → 401. |
| AC-02 | Integration: authenticated POST `/api/requests`; assert 201 + `status: pending`. |
| AC-03 | Integration: two employees submit; each sees only own records via GET `/api/requests/mine`. |
| AC-04 | Integration: seed item, PATCH quantity, GET and compare delta. |
| AC-05 | Integration: seed mixed-status requests, GET pending list, assert only pending. |
| AC-06 | Integration: approve → assert inventory delta + `actionedBy` audit field present. |
| AC-07 | Integration: reject with reason → assert reason field stored, inventory unchanged. |
| AC-08 | Integration: GET all requests as admin, verify `actionedBy` on actioned records. |
| AC-09 | Unit: dashboard aggregation function with mock data. |
| AC-10 | Integration: query-param filter + text-search on `/api/requests`. |
| AC-11 | E2E (Playwright): fill form → submit → assert toast visible → history row present. |
| AC-12 | Integration: missing token → 401; wrong role → 403. |
| AC-13 | Unit: password service hash + verify with bcrypt.compare. |
| AC-14 | Integration: parallel approve calls on same request → inventory decremented exactly once. |

---

## Assumptions and Open Questions

- **Authentication**: JWT HS256; access token 15 min, refresh token 7 days stored in HttpOnly cookie.
- **Seeding**: First-run seed creates one admin (`admin@company.com` / `Admin@12345`) and one demo employee.
- **Inventory bootstrapping**: Auto-created on first approval if item not found (FR-12). Admin can also add items directly.
- **Low-stock threshold**: Default 5 units; configurable via `LOW_STOCK_THRESHOLD` env var.
- **Item uniqueness**: Inventory items unique by name (case-insensitive); duplicate creation → HTTP 409.
- **Concurrency**: MongoDB atomic `$inc` + `findOneAndUpdate` used for inventory deduction (NFR-08).
- **Pagination**: Default page size 20 via offset pagination (`?page=1&limit=20`).
- Open: Employee request cancellation → **Out of scope for MVP**.

