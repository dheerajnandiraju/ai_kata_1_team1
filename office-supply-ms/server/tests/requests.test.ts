import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/server';
import { User } from '../src/modules/user/model';
import { InventoryItem } from '../src/modules/inventory/model';
import { SupplyRequest } from '../src/modules/requests/model';

async function createAndLogin(email: string, password: string, role: 'admin' | 'employee') {
  await User.deleteMany({ email });
  const hash = await bcrypt.hash(password, 12);
  await User.create({ name: role === 'admin' ? 'Admin' : 'Employee', email, passwordHash: hash, role });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

describe('Requests (AC-02, AC-03, AC-05, AC-06, AC-07, AC-08, AC-10, AC-14)', () => {
  let adminToken: string;
  let empToken: string;

  beforeEach(async () => {
    await SupplyRequest.deleteMany({});
    await InventoryItem.deleteMany({});
    adminToken = await createAndLogin('req_admin@test.com', 'Admin@12345', 'admin');
    empToken = await createAndLogin('req_emp@test.com', 'Emp@12345', 'employee');
  });

  it('AC-02: employee can submit a request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Notebook', quantity: 3 })
      .expect(201);
    expect(res.body.request.status).toBe('pending');
  });

  it('AC-03: employee sees only own requests', async () => {
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Pen', quantity: 5 });

    const empToken2 = await createAndLogin('req_emp2@test.com', 'Emp2@12345', 'employee');
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken2}`)
      .send({ itemName: 'Ruler', quantity: 2 });

    const res = await request(app)
      .get('/api/requests/mine')
      .set('Authorization', `Bearer ${empToken}`)
      .expect(200);
    expect(res.body.requests.every((r: any) => r.requestedBy.email === 'req_emp@test.com')).toBe(true);
  });

  it('AC-05: admin sees only pending requests on /pending', async () => {
    await request(app).post('/api/requests').set('Authorization', `Bearer ${empToken}`).send({ itemName: 'A', quantity: 1 });
    const allRes = await request(app).get('/api/requests/pending').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(allRes.body.requests.every((r: any) => r.status === 'pending')).toBe(true);
  });

  it('AC-06: approving decrements inventory and sets status approved', async () => {
    await InventoryItem.create({ name: 'Folder', quantity: 10, lowStock: false });
    const submitRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Folder', quantity: 3 });
    const id = submitRes.body.request._id;

    await request(app).patch(`/api/requests/${id}/approve`).set('Authorization', `Bearer ${adminToken}`).expect(200);

    const item = await InventoryItem.findOne({ name: 'Folder' });
    expect(item!.quantity).toBe(7);

    const req2 = await SupplyRequest.findById(id);
    expect(req2!.status).toBe('approved');
    expect(req2!.actionedBy).toBeDefined();
    expect(req2!.actionedAt).toBeDefined();
  });

  it('AC-07: rejecting stores reason and leaves inventory unchanged', async () => {
    await InventoryItem.create({ name: 'Scissors', quantity: 10, lowStock: false });
    const submitRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Scissors', quantity: 5 });
    const id = submitRes.body.request._id;

    await request(app)
      .patch(`/api/requests/${id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Out of budget' })
      .expect(200);

    const req = await SupplyRequest.findById(id);
    expect(req!.status).toBe('rejected');
    expect(req!.rejectionReason).toBe('Out of budget');

    const item = await InventoryItem.findOne({ name: 'Scissors' });
    expect(item!.quantity).toBe(10); // unchanged
  });

  it('AC-08: admin sees all requests with actionedBy and actionedAt', async () => {
    const submitRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Tape', quantity: 2 });
    await request(app).patch(`/api/requests/${submitRes.body.request._id}/approve`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app).get('/api/requests').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const approved = res.body.requests.find((r: any) => r.status === 'approved');
    expect(approved?.actionedBy).toBeDefined();
    expect(approved?.actionedAt).toBeDefined();
  });

  it('AC-10: search and filter work on request list', async () => {
    const highlightRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Highlighter', quantity: 1 });
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'Notebook', quantity: 2 });

    await request(app)
      .patch(`/api/requests/${highlightRes.body.request._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app)
      .get('/api/requests?search=Highlight&status=approved')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.requests.length).toBe(1);
    expect(res.body.requests[0].itemName).toBe('Highlighter');
    expect(res.body.requests[0].status).toBe('approved');
  });

  it('AC-14: concurrent approvals are idempotent', async () => {
    await InventoryItem.create({ name: 'ConcItem', quantity: 20, lowStock: false });
    const submitRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ itemName: 'ConcItem', quantity: 5 });
    const id = submitRes.body.request._id;

    const [r1, r2] = await Promise.all([
      request(app).patch(`/api/requests/${id}/approve`).set('Authorization', `Bearer ${adminToken}`),
      request(app).patch(`/api/requests/${id}/approve`).set('Authorization', `Bearer ${adminToken}`),
    ]);
    const statuses = [r1.status, r2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    const item = await InventoryItem.findOne({ name: 'ConcItem' });
    expect(item!.quantity).toBe(15); // deducted exactly once
  });
});
