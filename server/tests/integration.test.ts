import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import request from 'supertest';

let mongo: MongoMemoryServer;

// ---------- Shared Setup ----------
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ---------- Helpers ----------
const registerAdmin = async () => {
  // Register a normal user, then manually upgrade to admin
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin User', email: 'admin@test.com', password: 'Admin@123' });
  const userId = res.body.user.id;
  await mongoose.connection.collection('users').updateOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { $set: { role: 'admin' } }
  );
  // Re-login to get token with admin role
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@123' });
  return { token: loginRes.body.accessToken, user: loginRes.body.user };
};

const registerEmployee = async (email = 'emp@test.com') => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Employee User', email, password: 'Emp@12345' });
  return { token: res.body.accessToken, user: res.body.user };
};

// ============================================================
// TEST SUITE: HEALTH CHECK
// ============================================================
describe('GET /api/health', () => {
  it('TC-01: should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ============================================================
// TEST SUITE: AUTH MODULE
// ============================================================
describe('Auth Module', () => {
  // --- Registration ---
  describe('POST /api/auth/register', () => {
    it('TC-02: should register a new employee successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John Doe', email: 'john@test.com', password: 'Pass@123' });
      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('employee');
      expect(res.body.accessToken).toBeDefined();
    });

    it('TC-03: should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'User1', email: 'dup@test.com', password: 'Pass@123' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'User2', email: 'dup@test.com', password: 'Pass@456' });
      expect(res.status).toBe(409);
    });

    it('TC-04: should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'no-name@test.com' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('TC-05: should always assign employee role on registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Hacker', email: 'hack@test.com', password: 'Pass@123', role: 'admin' });
      expect(res.body.user.role).toBe('employee');
    });
  });

  // --- Login ---
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Login User', email: 'login@test.com', password: 'Pass@123' });
    });

    it('TC-06: should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'Pass@123' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('TC-07: should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'WrongPass' });
      expect(res.status).toBe(401);
    });

    it('TC-08: should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.com', password: 'Pass@123' });
      expect(res.status).toBe(401);
    });
  });

  // --- Refresh Token ---
  describe('POST /api/auth/refresh', () => {
    it('TC-09: should return 401 without refresh cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  // --- Protected Route Access ---
  describe('Authentication guard', () => {
    it('TC-10: should return 401 for requests without token', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(401);
    });

    it('TC-11: should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.status).toBe(401);
    });
  });
});

// ============================================================
// TEST SUITE: ROLE-BASED ACCESS CONTROL
// ============================================================
describe('Role-Based Access Control', () => {
  it('TC-12: employee should NOT access admin inventory route', async () => {
    const { token } = await registerEmployee();
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('TC-13: employee should NOT access pending requests route', async () => {
    const { token } = await registerEmployee();
    const res = await request(app)
      .get('/api/requests/pending')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('TC-14: employee should NOT approve a request', async () => {
    const { token } = await registerEmployee();
    const res = await request(app)
      .patch('/api/requests/000000000000000000000000/approve')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('TC-15: admin should access inventory route', async () => {
    const { token } = await registerAdmin();
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// TEST SUITE: INVENTORY MODULE (Admin)
// ============================================================
describe('Inventory Module', () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await registerAdmin();
    adminToken = admin.token;
  });

  describe('POST /api/inventory', () => {
    it('TC-16: admin should create an inventory item', async () => {
      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Stapler', quantity: 20 });
      expect(res.status).toBe(201);
      expect(res.body.item.name).toBe('stapler');
      expect(res.body.item.quantity).toBe(20);
      expect(res.body.item.lowStock).toBe(false);
    });

    it('TC-17: items with quantity <= 5 should be flagged low stock', async () => {
      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Eraser', quantity: 3 });
      expect(res.status).toBe(201);
      expect(res.body.item.lowStock).toBe(true);
    });
  });

  describe('GET /api/inventory', () => {
    it('TC-18: should list all inventory items', async () => {
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Pen', quantity: 50 });
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.total).toBe(1);
    });
  });

  describe('PATCH /api/inventory/:id', () => {
    it('TC-19: admin should update inventory quantity', async () => {
      const createRes = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Notebook', quantity: 10 });
      const id = createRes.body.item._id;
      const res = await request(app)
        .patch(`/api/inventory/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 25 });
      expect(res.status).toBe(200);
      expect(res.body.item.quantity).toBe(25);
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    it('TC-20: admin should delete an inventory item', async () => {
      const createRes = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tape', quantity: 5 });
      const id = createRes.body.item._id;
      const res = await request(app)
        .delete(`/api/inventory/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);
    });

    it('TC-21: deleting non-existent item should return 404', async () => {
      const res = await request(app)
        .delete(`/api/inventory/000000000000000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});

// ============================================================
// TEST SUITE: REQUESTS MODULE
// ============================================================
describe('Requests Module', () => {
  let adminToken: string;
  let empToken: string;

  beforeEach(async () => {
    const admin = await registerAdmin();
    adminToken = admin.token;
    const emp = await registerEmployee();
    empToken = emp.token;
  });

  // --- Submit Request (Employee) ---
  describe('POST /api/requests', () => {
    it('TC-22: employee should submit a supply request', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Pens', quantity: 5, remarks: 'Blue ink' });
      expect(res.status).toBe(201);
      expect(res.body.request.itemName).toBe('Pens');
      expect(res.body.request.quantity).toBe(5);
      expect(res.body.request.status).toBe('pending');
      expect(res.body.request.remarks).toBe('Blue ink');
    });

    it('TC-23: request without optional remarks should succeed', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Markers', quantity: 2 });
      expect(res.status).toBe(201);
      expect(res.body.request.remarks).toBeUndefined();
    });

    it('TC-24: request without itemName should fail', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ quantity: 5 });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // --- My Requests (Employee) ---
  describe('GET /api/requests/mine', () => {
    it('TC-25: employee should see only their own requests', async () => {
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Scissors', quantity: 1 });
      const res = await request(app)
        .get('/api/requests/mine')
        .set('Authorization', `Bearer ${empToken}`);
      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.total).toBe(1);
    });
  });

  // --- All Requests (Admin) ---
  describe('GET /api/requests', () => {
    it('TC-26: admin should see all requests', async () => {
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Paper', quantity: 10 });
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Pending Requests (Admin) ---
  describe('GET /api/requests/pending', () => {
    it('TC-27: should return only pending requests', async () => {
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Clips', quantity: 3 });
      const res = await request(app)
        .get('/api/requests/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.requests.every((r: any) => r.status === 'pending')).toBe(true);
    });
  });

  // --- Approve Request ---
  describe('PATCH /api/requests/:id/approve', () => {
    it('TC-28: admin should approve a request when inventory is sufficient', async () => {
      // Add inventory first
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'pens', quantity: 20 });
      // Employee submits request
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Pens', quantity: 5 });
      const requestId = reqRes.body.request._id;
      // Admin approves
      const res = await request(app)
        .patch(`/api/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('approved');
    });

    it('TC-29: approval should deduct inventory quantity', async () => {
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'notebooks', quantity: 10 });
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Notebooks', quantity: 3 });
      await request(app)
        .patch(`/api/requests/${reqRes.body.request._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Check inventory was deducted
      const invRes = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`);
      const item = invRes.body.items.find((i: any) => i.name === 'notebooks');
      expect(item.quantity).toBe(7); // 10 - 3
    });

    it('TC-30: should REJECT approval when inventory is insufficient', async () => {
      // Add only 1 jug
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'jugs', quantity: 1 });
      // Employee requests 3 jugs
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Jugs', quantity: 3 });
      // Admin tries to approve — should fail
      const res = await request(app)
        .patch(`/api/requests/${reqRes.body.request._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('Insufficient inventory');
    });

    it('TC-31: should return 404 for non-existent request', async () => {
      const res = await request(app)
        .patch('/api/requests/000000000000000000000000/approve')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('TC-32: should return 409 when approving already-approved request', async () => {
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'tape', quantity: 50 });
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Tape', quantity: 2 });
      const reqId = reqRes.body.request._id;
      await request(app)
        .patch(`/api/requests/${reqId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Try approving again
      const res = await request(app)
        .patch(`/api/requests/${reqId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(409);
    });
  });

  // --- Reject Request ---
  describe('PATCH /api/requests/:id/reject', () => {
    it('TC-33: admin should reject a request with reason', async () => {
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Chair', quantity: 1 });
      const res = await request(app)
        .patch(`/api/requests/${reqRes.body.request._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Out of budget' });
      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('rejected');
      expect(res.body.request.rejectionReason).toBe('Out of budget');
    });

    it('TC-34: admin should reject a request without reason (optional)', async () => {
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Monitor', quantity: 1 });
      const res = await request(app)
        .patch(`/api/requests/${reqRes.body.request._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('rejected');
    });

    it('TC-35: rejecting should NOT deduct inventory', async () => {
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'keyboard', quantity: 10 });
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Keyboard', quantity: 5 });
      await request(app)
        .patch(`/api/requests/${reqRes.body.request._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Not needed' });
      const invRes = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`);
      const item = invRes.body.items.find((i: any) => i.name === 'keyboard');
      expect(item.quantity).toBe(10); // unchanged
    });

    it('TC-36: should return 409 when rejecting already-rejected request', async () => {
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ itemName: 'Desk', quantity: 1 });
      const reqId = reqRes.body.request._id;
      await request(app)
        .patch(`/api/requests/${reqId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);
      const res = await request(app)
        .patch(`/api/requests/${reqId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(409);
    });
  });
});

// ============================================================
// TEST SUITE: DASHBOARD
// ============================================================
describe('Dashboard Module', () => {
  it('TC-37: should return aggregated stats for authenticated user', async () => {
    const { token } = await registerEmployee();
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalRequests');
    expect(res.body).toHaveProperty('pending');
    expect(res.body).toHaveProperty('approved');
    expect(res.body).toHaveProperty('rejected');
  });

  it('TC-38: admin dashboard should include inventory stats', async () => {
    const { token } = await registerAdmin();
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('inventoryCount');
    expect(res.body).toHaveProperty('lowStockCount');
  });

  it('TC-39: unauthenticated user should get 401', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });
});

// ============================================================
// TEST SUITE: REQUEST HISTORY
// ============================================================
describe('Request History & Status Tracking', () => {
  it('TC-40: request history should show all statuses', async () => {
    const { token: adminToken } = await registerAdmin();
    const { token: empToken } = await registerEmployee();

    // Add inventory
    await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'pens', quantity: 100 });

    // Create 3 requests
    const req1 = await request(app).post('/api/requests').set('Authorization', `Bearer ${empToken}`).send({ itemName: 'Pens', quantity: 2 });
    const req2 = await request(app).post('/api/requests').set('Authorization', `Bearer ${empToken}`).send({ itemName: 'Pens', quantity: 3 });
    const req3 = await request(app).post('/api/requests').set('Authorization', `Bearer ${empToken}`).send({ itemName: 'Pens', quantity: 1 });

    // Approve req1, reject req2, leave req3 pending
    await request(app).patch(`/api/requests/${req1.body.request._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/requests/${req2.body.request._id}/reject`).set('Authorization', `Bearer ${adminToken}`).send({ reason: 'Not needed' });

    // Verify history
    const res = await request(app).get('/api/requests').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const statuses = res.body.requests.map((r: any) => r.status);
    expect(statuses).toContain('approved');
    expect(statuses).toContain('rejected');
    expect(statuses).toContain('pending');
  });
});
