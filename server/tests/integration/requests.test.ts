import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import { User, IUser } from '../../src/modules/user/model';
import { InventoryItem } from '../../src/modules/inventory/model';
import { SupplyRequest } from '../../src/modules/requests/model';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

let adminToken: string;
let employeeToken: string;
let employee: IUser;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  const hash = await bcrypt.hash('pass1234', 10);
  await User.create({ name: 'Admin', email: 'admin@req.com', passwordHash: hash, role: 'admin' });
  employee = await User.create({ name: 'Emp', email: 'emp@req.com', passwordHash: hash, role: 'employee' });
  const a = await request(app).post('/api/auth/login').send({ email: 'admin@req.com', password: 'pass1234' });
  const e = await request(app).post('/api/auth/login').send({ email: 'emp@req.com', password: 'pass1234' });
  adminToken = (a.body as { accessToken: string }).accessToken;
  employeeToken = (e.body as { accessToken: string }).accessToken;
});
afterEach(async () => {
  await SupplyRequest.deleteMany({});
  await InventoryItem.deleteMany({});
});
afterAll(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await mongoose.disconnect();
});

// ─── Submit ───────────────────────────────────────────────────────────────────
describe('POST /api/requests', () => {
  it('201 — employee submits a request', async () => {
    const res = await request(app).post('/api/requests').set('Authorization', `Bearer ${employeeToken}`)
      .send({ itemName: 'A4 Paper', quantity: 5, remarks: 'Urgent' });
    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request.itemName).toBe('a4 paper');
  });

  it('403 — admin cannot submit a request', async () => {
    const res = await request(app).post('/api/requests').set('Authorization', `Bearer ${adminToken}`)
      .send({ itemName: 'pen', quantity: 2 });
    expect(res.status).toBe(403);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).post('/api/requests').send({ itemName: 'pen', quantity: 2 });
    expect(res.status).toBe(401);
  });

  it('422 — missing itemName', async () => {
    const res = await request(app).post('/api/requests').set('Authorization', `Bearer ${employeeToken}`)
      .send({ quantity: 5 });
    expect(res.status).toBe(422);
  });

  it('422 — quantity less than 1', async () => {
    const res = await request(app).post('/api/requests').set('Authorization', `Bearer ${employeeToken}`)
      .send({ itemName: 'pen', quantity: 0 });
    expect(res.status).toBe(422);
  });
});

// ─── My Requests ──────────────────────────────────────────────────────────────
describe('GET /api/requests/mine', () => {
  beforeEach(async () => {
    await SupplyRequest.create([
      { requestedBy: employee._id, itemName: 'pen', quantity: 2, status: 'pending' },
      { requestedBy: employee._id, itemName: 'paper', quantity: 5, status: 'approved' },
    ]);
  });

  it('200 — employee sees only their own requests', async () => {
    const res = await request(app).get('/api/requests/mine').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.length).toBe(2);
    expect(res.body.total).toBe(2);
  });

  it('200 — filters by status', async () => {
    const res = await request(app).get('/api/requests/mine?status=pending').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { status: string }) => r.status === 'pending')).toBe(true);
  });

  it('403 — admin cannot access /mine', async () => {
    const res = await request(app).get('/api/requests/mine').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Admin List All ───────────────────────────────────────────────────────────
describe('GET /api/requests', () => {
  beforeEach(async () => {
    await SupplyRequest.create([
      { requestedBy: employee._id, itemName: 'stapler', quantity: 1 },
      { requestedBy: employee._id, itemName: 'tape', quantity: 3 },
    ]);
  });

  it('200 — admin lists all requests', async () => {
    const res = await request(app).get('/api/requests').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it('200 — admin searches by item name', async () => {
    const res = await request(app).get('/api/requests?search=stapler').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { itemName: string }) => r.itemName.includes('stapler'))).toBe(true);
  });

  it('403 — employee cannot list all requests', async () => {
    const res = await request(app).get('/api/requests').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Pending Requests ─────────────────────────────────────────────────────────
describe('GET /api/requests/pending', () => {
  beforeEach(async () => {
    await SupplyRequest.create([
      { requestedBy: employee._id, itemName: 'pen', quantity: 2, status: 'pending' },
      { requestedBy: employee._id, itemName: 'paper', quantity: 5, status: 'approved' },
    ]);
  });

  it('200 — returns only pending requests', async () => {
    const res = await request(app).get('/api/requests/pending').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.requests.every((r: { status: string }) => r.status === 'pending')).toBe(true);
  });
});

// ─── Approve ──────────────────────────────────────────────────────────────────
describe('PATCH /api/requests/:id/approve', () => {
  it('200 — admin approves a pending request and deducts inventory', async () => {
    await InventoryItem.create({ name: 'pen', quantity: 50, lowStock: false });
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'pen', quantity: 10 });
    const res = await request(app).patch(`/api/requests/${req._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    const inv = await InventoryItem.findOne({ name: 'pen' });
    expect(inv?.quantity).toBe(40);
  });

  it('409 — cannot approve already approved request', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'tape', quantity: 1, status: 'approved' });
    const res = await request(app).patch(`/api/requests/${req._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('409 — cannot approve already rejected request', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'tape', quantity: 1, status: 'rejected' });
    const res = await request(app).patch(`/api/requests/${req._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('404 — request not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).patch(`/api/requests/${fakeId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('403 — employee cannot approve', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'ruler', quantity: 1 });
    const res = await request(app).patch(`/api/requests/${req._id}/approve`).set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('inventory deduction never goes below 0', async () => {
    await InventoryItem.create({ name: 'eraser', quantity: 2, lowStock: true });
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'eraser', quantity: 10 });
    await request(app).patch(`/api/requests/${req._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    const inv = await InventoryItem.findOne({ name: 'eraser' });
    expect(inv!.quantity).toBeGreaterThanOrEqual(0);
  });

  it('auto-creates inventory item if not found on approval', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'newitem', quantity: 1 });
    const res = await request(app).patch(`/api/requests/${req._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const inv = await InventoryItem.findOne({ name: 'newitem' });
    expect(inv).not.toBeNull();
  });
});

// ─── Reject ───────────────────────────────────────────────────────────────────
describe('PATCH /api/requests/:id/reject', () => {
  it('200 — admin rejects a pending request with reason', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'chair', quantity: 1 });
    const res = await request(app).patch(`/api/requests/${req._id}/reject`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Over budget' });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');
    expect(res.body.request.rejectionReason).toBe('Over budget');
  });

  it('200 — admin rejects without reason', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'desk', quantity: 1 });
    const res = await request(app).patch(`/api/requests/${req._id}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');
  });

  it('409 — cannot reject already approved request', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'lamp', quantity: 1, status: 'approved' });
    const res = await request(app).patch(`/api/requests/${req._id}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('404 — request not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).patch(`/api/requests/${fakeId}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
