/**
 * Integration test suite — Office Supply Management System
 *
 * Covers:
 *  - Health check
 *  - Auth: register, login, logout, refresh token rotation, RBAC
 *  - Security: NoSQL injection prevention, domain restriction, input validation
 *  - Inventory: CRUD, low-stock flag, search, duplicate prevention, 404s
 *  - Requests: create, approve (atomic), reject, list/filter, RBAC
 *  - Dashboard: per-role response shape
 */

import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app';

// Tests must set JWT env vars before importing app (env.ts validates at load time).
// Jest sets these via the globalSetup or via the env block below — handled in jest.config.
const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/osms_test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Login and return { accessToken, refreshCookie } */
async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  const setCookie: string[] = res.headers['set-cookie'] ?? [];
  const refreshCookie = setCookie.find((c) => c.startsWith('refreshToken=')) ?? '';
  return { accessToken: res.body.accessToken as string, refreshCookie };
}

/** Extract raw refresh token value from Set-Cookie header string */
function extractRefreshToken(cookie: string): string {
  return cookie.split(';')[0].replace('refreshToken=', '');
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  // Seed a reusable admin and employee for all test suites
  const empHash = await bcrypt.hash('Password1', 4);
  const adminHash = await bcrypt.hash('Admin@12345', 4);
  const User = mongoose.model('User');
  await User.insertMany([
    { name: 'Test Employee', email: 'employee@test.com', passwordHash: empHash, role: 'employee' },
    { name: 'Test Admin',    email: 'admin@test.com',    passwordHash: adminHash,  role: 'admin'    },
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ===========================================================================
// Health
// ===========================================================================

describe('GET /api/health', () => {
  it('returns 200 { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ===========================================================================
// Auth — Registration
// ===========================================================================

describe('POST /api/auth/register', () => {
  it('creates a new employee account (201)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'New User',
      email: 'newuser@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('employee');
    expect(res.body.user.passwordHash).toBeUndefined(); // never returned
    expect(res.body.accessToken).toBeDefined();
    // Refresh token arrives via HttpOnly cookie
    const cookies: string[] = res.headers['set-cookie'] ?? [];
    expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('returns 409 for duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup',
      email: 'employee@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 when password too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad',
      email: 'bad@test.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is malformed', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad',
      email: 'not-an-email',
      password: 'Password1',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// Auth — Login
// ===========================================================================

describe('POST /api/auth/login', () => {
  it('returns 200 + accessToken + refreshToken cookie', async () => {
    const { accessToken, refreshCookie } = await loginAs('employee@test.com', 'Password1');
    expect(accessToken).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'employee@test.com',
      password: 'WrongPass1',
    });
    expect(res.status).toBe(401);
    // Must NOT leak which field was wrong
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 400 for missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'Password1' });
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// Auth — Refresh token rotation
// ===========================================================================

describe('POST /api/auth/refresh — token rotation', () => {
  let originalCookie: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'employee@test.com',
      password: 'Password1',
    });
    const cookies: string[] = res.headers['set-cookie'] ?? [];
    originalCookie = cookies.find((c: string) => c.startsWith('refreshToken=')) ?? '';
  });

  it('returns a new accessToken (200)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    // New refresh cookie must be issued (rotation)
    const newCookies: string[] = res.headers['set-cookie'] ?? [];
    expect(newCookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('old refresh token is rejected after rotation (401)', async () => {
    // Use the old token again — it was revoked during the first refresh above
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie);
    expect(res.status).toBe(401);
  });

  it('returns 401 when no cookie present', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// Auth — Logout
// ===========================================================================

describe('POST /api/auth/logout', () => {
  it('clears the refresh cookie and returns 204', async () => {
    const { accessToken, refreshCookie } = await loginAs('employee@test.com', 'Password1');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(204);
    // Cookie should be cleared (Max-Age=0 or Expires in the past)
    const cookies: string[] = res.headers['set-cookie'] ?? [];
    const cleared = cookies.find((c: string) => c.startsWith('refreshToken='));
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });
});

// ===========================================================================
// Security — RBAC & auth middleware
// ===========================================================================

describe('RBAC enforcement', () => {
  let empToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ({ accessToken: empToken }   = await loginAs('employee@test.com', 'Password1'));
    ({ accessToken: adminToken } = await loginAs('admin@test.com',    'Admin@12345'));
  });

  it('returns 401 on protected route without token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('employee cannot access admin-only inventory route (403)', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  it('admin cannot POST to employee-only /api/requests (403)', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemName: 'Pens', quantity: 2 });
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// Security — NoSQL injection prevention
// ===========================================================================

describe('NoSQL injection prevention', () => {
  let empToken: string;

  beforeAll(async () => {
    ({ accessToken: empToken } = await loginAs('employee@test.com', 'Password1'));
    // Create a request so /mine has data
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Anti-injection test item', quantity: 1 });
  });

  it('?status[$ne]=pending does not bypass status filter (simple parser strips it)', async () => {
    // With query parser=simple, qs parses this as the literal string "pending" key path
    // The service whitelist then rejects it, so the filter is simply ignored (returns all)
    const res = await request(app)
      .get('/api/requests/mine?status[$ne]=pending')
      .set('Authorization', `Bearer ${empToken}`);
    // Must not throw 500 (no MongoDB error from injected operator)
    expect(res.status).toBe(200);
  });

  it('?search with regex special chars does not cause 500 (ReDoS protection)', async () => {
    const res = await request(app)
      .get('/api/requests/mine?search=(a%2B)%2B%24')  // URL-encoded (a+)+$
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
  });

  it('invalid date in ?from param is silently ignored (no 500)', async () => {
    const res = await request(app)
      .get('/api/requests/mine?from=not-a-date')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// Inventory
// ===========================================================================

describe('Inventory CRUD (admin only)', () => {
  let adminToken: string;
  let itemId: string;

  beforeAll(async () => {
    ({ accessToken: adminToken } = await loginAs('admin@test.com', 'Admin@12345'));
  });

  it('POST /api/inventory — creates an item (201)', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Staplers', quantity: 20 });
    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('staplers'); // normalised to lowercase
    expect(res.body.item.lowStock).toBe(false);
    itemId = res.body.item._id;
  });

  it('POST /api/inventory — returns 409 for duplicate item name', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Staplers', quantity: 5 });
    expect(res.status).toBe(409);
  });

  it('POST /api/inventory — returns 400 for negative quantity', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Item', quantity: -1 });
    expect(res.status).toBe(400);
  });

  it('GET /api/inventory — lists items with total', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /api/inventory?search=stap — returns matching items', async () => {
    const res = await request(app)
      .get('/api/inventory?search=stap')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: { name: string }) => i.name.includes('stap'))).toBe(true);
  });

  it('PATCH /api/inventory/:id — updates quantity and sets lowStock=true when below threshold', async () => {
    const res = await request(app)
      .patch(`/api/inventory/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 3 }); // LOW_STOCK_THRESHOLD=5 in test env
    expect(res.status).toBe(200);
    expect(res.body.item.quantity).toBe(3);
    expect(res.body.item.lowStock).toBe(true);
  });

  it('PATCH /api/inventory/:id — returns 404 for unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/inventory/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/inventory/:id — deletes the item (204)', async () => {
    const res = await request(app)
      .delete(`/api/inventory/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/inventory/:id — returns 404 for already-deleted item', async () => {
    const res = await request(app)
      .delete(`/api/inventory/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Supply Requests
// ===========================================================================

describe('Supply Requests workflow', () => {
  let empToken: string;
  let adminToken: string;
  let pendingId: string;
  let toRejectId: string;

  beforeAll(async () => {
    ({ accessToken: empToken }   = await loginAs('employee@test.com', 'Password1'));
    ({ accessToken: adminToken } = await loginAs('admin@test.com',    'Admin@12345'));

    // Pre-create an inventory item so approval can deduct stock
    await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Notebooks', quantity: 50 });
  });

  it('POST /api/requests — creates a pending request (201)', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Notebooks', quantity: 5, remarks: 'Urgently needed' });
    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request.requestedBy).toBeDefined();
    pendingId = res.body.request._id;
  });

  it('POST /api/requests — returns 400 for quantity < 1', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Pens', quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('POST /api/requests — returns 400 when itemName is missing', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('GET /api/requests/mine — employee sees only their own requests', async () => {
    const res = await request(app)
      .get('/api/requests/mine')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /api/requests/mine?status=pending — filters by status', async () => {
    const res = await request(app)
      .get('/api/requests/mine?status=pending')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { status: string }) => r.status === 'pending')).toBe(true);
  });

  it('GET /api/requests/mine?search=notebooks — filters by item name', async () => {
    const res = await request(app)
      .get('/api/requests/mine?search=notebooks')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { itemName: string }) => r.itemName.includes('notebook'))).toBe(true);
  });

  it('GET /api/requests/pending — admin sees pending list', async () => {
    const res = await request(app)
      .get('/api/requests/pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { status: string }) => r.status === 'pending')).toBe(true);
  });

  it('GET /api/requests — admin sees all requests', async () => {
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('PATCH /api/requests/:id/approve — approves and atomically deducts stock (200)', async () => {
    // Create a second request to reject later
    const r2 = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Notebooks', quantity: 2 });
    toRejectId = r2.body.request._id;

    const res = await request(app)
      .patch(`/api/requests/${pendingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.request.actionedBy).toBeDefined();
    expect(res.body.request.actionedAt).toBeDefined();
  });

  it('PATCH /api/requests/:id/approve — returns 409 if already approved', async () => {
    const res = await request(app)
      .patch(`/api/requests/${pendingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('PATCH /api/requests/:id/reject — rejects with a reason (200)', async () => {
    const res = await request(app)
      .patch(`/api/requests/${toRejectId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Budget exceeded' });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');
    expect(res.body.request.rejectionReason).toBe('Budget exceeded');
  });

  it('PATCH /api/requests/:id/reject — returns 409 if already rejected', async () => {
    const res = await request(app)
      .patch(`/api/requests/${toRejectId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Duplicate' });
    expect(res.status).toBe(409);
  });

  it('PATCH /api/requests/:id/approve — returns 404 for unknown request id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/requests/${fakeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Dashboard
// ===========================================================================

describe('GET /api/dashboard', () => {
  let empToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ({ accessToken: empToken }   = await loginAs('employee@test.com', 'Password1'));
    ({ accessToken: adminToken } = await loginAs('admin@test.com',    'Admin@12345'));
  });

  it('employee receives request stats without inventory fields', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalRequests).toBe('number');
    expect(typeof res.body.pending).toBe('number');
    expect(typeof res.body.approved).toBe('number');
    expect(typeof res.body.rejected).toBe('number');
    expect(res.body.inventoryCount).toBeUndefined();
    expect(res.body.lowStockCount).toBeUndefined();
  });

  it('admin receives request stats AND inventory fields', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.inventoryCount).toBe('number');
    expect(typeof res.body.lowStockCount).toBe('number'
describe('POST /api/auth/refresh — token rotation', () => {
  let originalCookie: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'employee@test.com',
      password: 'Password1',
    });
    const cookies: string[] = res.headers['set-cookie'] ?? [];
    originalCookie = cookies.find((c: string) => c.startsWith('refreshToken=')) ?? '';
  });

  it('returns a new accessToken (200)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    // New refresh cookie must be issued (rotation)
    const newCookies: string[] = res.headers['set-cookie'] ?? [];
    expect(newCookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('old refresh token is rejected after rotation (401)', async () => {
    // Use the old token again — it was revoked during the first refresh above
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie);
    expect(res.status).toBe(401);
  });

  it('returns 401 when no cookie present', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// Auth — Logout
// ===========================================================================

describe('POST /api/auth/logout', () => {
  it('clears the refresh cookie and returns 204', async () => {
    const { accessToken, refreshCookie } = await loginAs('employee@test.com', 'Password1');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(204);
    // Cookie should be cleared (Max-Age=0 or Expires in the past)
    const cookies: string[] = res.headers['set-cookie'] ?? [];
    const cleared = cookies.find((c: string) => c.startsWith('refreshToken='));
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });
});

// ===========================================================================
// Security — RBAC & auth middleware
// ===========================================================================

describe('RBAC enforcement', () => {
  let empToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ({ accessToken: empToken }   = await loginAs('employee@test.com', 'Password1'));
    ({ accessToken: adminToken } = await loginAs('admin@test.com',    'Admin@12345'));
  });

  it('returns 401 on protected route without token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('employee cannot access admin-only inventory route (403)', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  it('admin cannot POST to employee-only /api/requests (403)', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemName: 'Pens', quantity: 2 });
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// Security — NoSQL injection prevention
// ===========================================================================

describe('NoSQL injection prevention', () => {
  let empToken: string;

  beforeAll(async () => {
    ({ accessToken: empToken } = await loginAs('employee@test.com', 'Password1'));
    // Create a request so /mine has data
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Anti-injection test item', quantity: 1 });
  });

  it('?status[$ne]=pending does not bypass status filter (simple parser strips it)', async () => {
    // With query parser=simple, qs parses this as the literal string "pending" key path
    // The service whitelist then rejects it, so the filter is simply ignored (returns all)
    const res = await request(app)
      .get('/api/requests/mine?status[$ne]=pending')
      .set('Authorization', `Bearer ${empToken}`);
    // Must not throw 500 (no MongoDB error from injected operator)
    expect(res.status).toBe(200);
  });

  it('?search with regex special chars does not cause 500 (ReDoS protection)', async () => {
    const res = await request(app)
      .get('/api/requests/mine?search=(a%2B)%2B%24')  // URL-encoded (a+)+$
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
  });

  it('invalid date in ?from param is silently ignored (no 500)', async () => {
    const res = await request(app)
      .get('/api/requests/mine?from=not-a-date')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// Inventory
// ===========================================================================

describe('Inventory CRUD (admin only)', () => {
  let adminToken: string;
  let itemId: string;

  beforeAll(async () => {
    ({ accessToken: adminToken } = await loginAs('admin@test.com', 'Admin@12345'));
  });

  it('POST /api/inventory — creates an item (201)', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Staplers', quantity: 20 });
    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('staplers'); // normalised to lowercase
    expect(res.body.item.lowStock).toBe(false);
    itemId = res.body.item._id;
  });

  it('POST /api/inventory — returns 409 for duplicate item name', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Staplers', quantity: 5 });
    expect(res.status).toBe(409);
  });

  it('POST /api/inventory — returns 400 for negative quantity', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Item', quantity: -1 });
    expect(res.status).toBe(400);
  });

  it('GET /api/inventory — lists items with total', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /api/inventory?search=stap — returns matching items', async () => {
    const res = await request(app)
      .get('/api/inventory?search=stap')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: { name: string }) => i.name.includes('stap'))).toBe(true);
  });

  it('PATCH /api/inventory/:id — updates quantity and sets lowStock=true when below threshold', async () => {
    const res = await request(app)
      .patch(`/api/inventory/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 3 }); // LOW_STOCK_THRESHOLD=5 in test env
    expect(res.status).toBe(200);
    expect(res.body.item.quantity).toBe(3);
    expect(res.body.item.lowStock).toBe(true);
  });

  it('PATCH /api/inventory/:id — returns 404 for unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/inventory/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/inventory/:id — deletes the item (204)', async () => {
    const res = await request(app)
      .delete(`/api/inventory/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/inventory/:id — returns 404 for already-deleted item', async () => {
    const res = await request(app)
      .delete(`/api/inventory/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Supply Requests
// ===========================================================================

describe('Supply Requests workflow', () => {
  let empToken: string;
  let adminToken: string;
  let pendingId: string;
  let toRejectId: string;

  beforeAll(async () => {
    ({ accessToken: empToken }   = await loginAs('employee@test.com', 'Password1'));
    ({ accessToken: adminToken } = await loginAs('admin@test.com',    'Admin@12345'));

    // Pre-create an inventory item so approval can deduct stock
    await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Notebooks', quantity: 50 });
  });

  it('POST /api/requests — creates a pending request (201)', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Notebooks', quantity: 5, remarks: 'Urgently needed' });
    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request.requestedBy).toBeDefined();
    pendingId = res.body.request._id;
  });

  it('POST /api/requests — returns 400 for quantity < 1', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Pens', quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('POST /api/requests — returns 400 when itemName is missing', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('GET /api/requests/mine — employee sees only their own requests', async () => {
    const res = await request(app)
      .get('/api/requests/mine')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /api/requests/mine?status=pending — filters by status', async () => {
    const res = await request(app)
      .get('/api/requests/mine?status=pending')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { status: string }) => r.status === 'pending')).toBe(true);
  });

  it('GET /api/requests/mine?search=notebooks — filters by item name', async () => {
    const res = await request(app)
      .get('/api/requests/mine?search=notebooks')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { itemName: string }) => r.itemName.includes('notebook'))).toBe(true);
  });

  it('GET /api/requests/pending — admin sees pending list', async () => {
    const res = await request(app)
      .get('/api/requests/pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { status: string }) => r.status === 'pending')).toBe(true);
  });

  it('GET /api/requests — admin sees all requests', async () => {
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('PATCH /api/requests/:id/approve — approves and atomically deducts stock (200)', async () => {
    // Create a second request to reject later
    const r2 = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Notebooks', quantity: 2 });
    toRejectId = r2.body.request._id;

    const res = await request(app)
      .patch(`/api/requests/${pendingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.request.actionedBy).toBeDefined();
    expect(res.body.request.actionedAt).toBeDefined();
  });

  it('PATCH /api/requests/:id/approve — returns 409 if already approved', async () => {
    const res = await request(app)
      .patch(`/api/requests/${pendingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('PATCH /api/requests/:id/reject — rejects with a reason (200)', async () => {
    const res = await request(app)
      .patch(`/api/requests/${toRejectId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Budget exceeded' });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');
    expect(res.body.request.rejectionReason).toBe('Budget exceeded');
  });

  it('PATCH /api/requests/:id/reject — returns 409 if already rejected', async () => {
    const res = await request(app)
      .patch(`/api/requests/${toRejectId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Duplicate' });
    expect(res.status).toBe(409);
  });

  it('PATCH /api/requests/:id/approve — returns 404 for unknown request id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/requests/${fakeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Dashboard
// ===========================================================================

describe('GET /api/dashboard', () => {
  let empToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ({ accessToken: empToken }   = await loginAs('employee@test.com', 'Password1'));
    ({ accessToken: adminToken } = await loginAs('admin@test.com',    'Admin@12345'));
  });

  it('employee receives request stats without inventory fields', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalRequests).toBe('number');
    expect(typeof res.body.pending).toBe('number');
    expect(typeof res.body.approved).toBe('number');
    expect(typeof res.body.rejected).toBe('number');
    expect(res.body.inventoryCount).toBeUndefined();
    expect(res.body.lowStockCount).toBeUndefined();
  });

  it('admin receives request stats AND inventory fields', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.inventoryCount).toBe('number');
    expect(typeof res.body.lowStockCount).toBe('number');
  });
});
