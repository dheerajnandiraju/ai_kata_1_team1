import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import { User } from '../../src/modules/user/model';
import { InventoryItem } from '../../src/modules/inventory/model';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

let adminToken: string;
let employeeToken: string;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  const hash = await bcrypt.hash('pass1234', 10);
  await User.create({ name: 'Admin', email: 'admin@inv.com', passwordHash: hash, role: 'admin' });
  await User.create({ name: 'Emp', email: 'emp@inv.com', passwordHash: hash, role: 'employee' });
  const a = await request(app).post('/api/auth/login').send({ email: 'admin@inv.com', password: 'pass1234' });
  const e = await request(app).post('/api/auth/login').send({ email: 'emp@inv.com', password: 'pass1234' });
  adminToken = (a.body as { accessToken: string }).accessToken;
  employeeToken = (e.body as { accessToken: string }).accessToken;
});
afterEach(async () => { await InventoryItem.deleteMany({}); });
afterAll(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await mongoose.disconnect();
});

// ─── Create ───────────────────────────────────────────────────────────────────
describe('POST /api/inventory', () => {
  it('201 — admin creates an inventory item', async () => {
    const res = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'A4 Paper', quantity: 100 });
    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('a4 paper');
    expect(res.body.item.quantity).toBe(100);
  });

  it('sets lowStock true when quantity <= threshold (5)', async () => {
    const res = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'pencil', quantity: 3 });
    expect(res.status).toBe(201);
    expect(res.body.item.lowStock).toBe(true);
  });

  it('409 — duplicate item name', async () => {
    await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`).send({ name: 'pen', quantity: 10 });
    const res = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`).send({ name: 'pen', quantity: 5 });
    expect(res.status).toBe(409);
  });

  it('403 — employee cannot create inventory item', async () => {
    const res = await request(app).post('/api/inventory').set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'ruler', quantity: 10 });
    expect(res.status).toBe(403);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).post('/api/inventory').send({ name: 'ruler', quantity: 10 });
    expect(res.status).toBe(401);
  });

  it('422 — negative quantity rejected', async () => {
    const res = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'eraser', quantity: -5 });
    expect(res.status).toBe(422);
  });

  it('422 — missing name rejected', async () => {
    const res = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(422);
  });
});

// ─── List ─────────────────────────────────────────────────────────────────────
describe('GET /api/inventory', () => {
  beforeEach(async () => {
    await InventoryItem.create([
      { name: 'a4 paper', quantity: 100, lowStock: false },
      { name: 'pen', quantity: 3, lowStock: true },
      { name: 'stapler', quantity: 20, lowStock: false },
    ]);
  });

  it('200 — returns paginated items list', async () => {
    const res = await request(app).get('/api/inventory').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.total).toBeDefined();
  });

  it('200 — search filters by name', async () => {
    const res = await request(app).get('/api/inventory?search=pen').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: { name: string }) => i.name.includes('pen'))).toBe(true);
  });

  it('403 — employee cannot list inventory', async () => {
    const res = await request(app).get('/api/inventory').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Update ───────────────────────────────────────────────────────────────────
describe('PATCH /api/inventory/:id', () => {
  it('200 — admin updates quantity and recalculates lowStock', async () => {
    const item = await InventoryItem.create({ name: 'tape', quantity: 50, lowStock: false });
    const res = await request(app).patch(`/api/inventory/${item._id}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.item.quantity).toBe(2);
    expect(res.body.item.lowStock).toBe(true);
  });

  it('404 — item not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).patch(`/api/inventory/${fakeId}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(404);
  });

  it('403 — employee cannot update inventory', async () => {
    const item = await InventoryItem.create({ name: 'clip', quantity: 10, lowStock: false });
    const res = await request(app).patch(`/api/inventory/${item._id}`).set('Authorization', `Bearer ${employeeToken}`)
      .send({ quantity: 5 });
    expect(res.status).toBe(403);
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────
describe('DELETE /api/inventory/:id', () => {
  it('204 — admin deletes item', async () => {
    const item = await InventoryItem.create({ name: 'scissors', quantity: 10, lowStock: false });
    const res = await request(app).delete(`/api/inventory/${item._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    expect(await InventoryItem.findById(item._id)).toBeNull();
  });

  it('404 — item not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/inventory/${fakeId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('403 — employee cannot delete inventory', async () => {
    const item = await InventoryItem.create({ name: 'marker', quantity: 10, lowStock: false });
    const res = await request(app).delete(`/api/inventory/${item._id}`).set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });
});
