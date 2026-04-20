import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import { User, IUser } from '../../src/modules/user/model';
import { SupplyRequest } from '../../src/modules/requests/model';
import { InventoryItem } from '../../src/modules/inventory/model';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

let adminToken: string;
let employeeToken: string;
let employee: IUser;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  const hash = await bcrypt.hash('pass1234', 10);
  await User.create({ name: 'Admin', email: 'admin@dash.com', passwordHash: hash, role: 'admin' });
  employee = await User.create({ name: 'Emp', email: 'emp@dash.com', passwordHash: hash, role: 'employee' });
  const a = await request(app).post('/api/auth/login').send({ email: 'admin@dash.com', password: 'pass1234' });
  const e = await request(app).post('/api/auth/login').send({ email: 'emp@dash.com', password: 'pass1234' });
  adminToken = (a.body as { accessToken: string }).accessToken;
  employeeToken = (e.body as { accessToken: string }).accessToken;

  await InventoryItem.create([
    { name: 'pen', quantity: 2, lowStock: true },
    { name: 'paper', quantity: 100, lowStock: false },
  ]);
  await SupplyRequest.create([
    { requestedBy: employee._id, itemName: 'pen', quantity: 1, status: 'pending' },
    { requestedBy: employee._id, itemName: 'paper', quantity: 2, status: 'approved' },
    { requestedBy: employee._id, itemName: 'tape', quantity: 1, status: 'rejected' },
  ]);
});
afterAll(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await SupplyRequest.deleteMany({});
  await InventoryItem.deleteMany({});
  await mongoose.disconnect();
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
describe('GET /api/dashboard', () => {
  it('200 — admin sees full stats including inventoryCount and lowStockCount', async () => {
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBeGreaterThanOrEqual(3);
    expect(res.body.pending).toBeGreaterThanOrEqual(1);
    expect(res.body.approved).toBeGreaterThanOrEqual(1);
    expect(res.body.rejected).toBeGreaterThanOrEqual(1);
    expect(res.body.inventoryCount).toBeGreaterThanOrEqual(2);
    expect(res.body.lowStockCount).toBeGreaterThanOrEqual(1);
  });

  it('200 — employee sees their own stats, no inventoryCount', async () => {
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBeDefined();
    expect(res.body.inventoryCount).toBeUndefined();
    expect(res.body.lowStockCount).toBeUndefined();
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────
describe('Security — JWT & Role Enforcement', () => {
  it('401 — no Authorization header on protected route', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });

  it('401 — malformed Bearer token', async () => {
    const res = await request(app).get('/api/inventory').set('Authorization', 'Bearer totallyinvalidtoken');
    expect(res.status).toBe(401);
  });

  it('401 — expired/tampered token (wrong secret)', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UifQ.invalidsignature';
    const res = await request(app).get('/api/inventory').set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });

  it('403 — employee accessing admin-only inventory route', async () => {
    const res = await request(app).get('/api/inventory').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('403 — employee cannot approve requests', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'book', quantity: 1 });
    const res = await request(app).patch(`/api/requests/${req._id}/approve`).set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
    await SupplyRequest.findByIdAndDelete(req._id);
  });
});

// ─── Input Validation / Injection Prevention ──────────────────────────────────
describe('Security — Input Validation', () => {
  it('422 — rejects NoSQL injection attempt in login email field', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: 'pass' });
    expect([400, 422]).toContain(res.status);
  });

  it('422 — rejects empty string itemName in request submission', async () => {
    const res = await request(app).post('/api/requests').set('Authorization', `Bearer ${employeeToken}`)
      .send({ itemName: '', quantity: 1 });
    expect(res.status).toBe(422);
  });

  it('422 — rejects string quantity in inventory creation', async () => {
    const res = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'widget', quantity: 'many' });
    expect(res.status).toBe(422);
  });

  it('does not expose stack trace in error response', async () => {
    const res = await request(app).get('/api/inventory').set('Authorization', 'Bearer badtoken');
    expect(res.body.stack).toBeUndefined();
  });
});
