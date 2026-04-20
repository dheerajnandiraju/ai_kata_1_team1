import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/server';
import { User } from '../src/modules/user/model';
import { SupplyRequest } from '../src/modules/requests/model';

async function createAndLogin(email: string, password: string, role: 'admin' | 'employee') {
  await User.deleteMany({ email });
  const hash = await bcrypt.hash(password, 12);
  await User.create({ name: role, email, passwordHash: hash, role });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

describe('Dashboard (AC-09)', () => {
  beforeEach(async () => {
    await SupplyRequest.deleteMany({});
  });

  it('AC-09: returns correct aggregated counts for admin', async () => {
    const adminToken = await createAndLogin('dash_admin@test.com', 'Admin@12345', 'admin');
    const empToken = await createAndLogin('dash_emp@test.com', 'Emp@12345', 'employee');

    const emp = await User.findOne({ email: 'dash_emp@test.com' });
    await SupplyRequest.create([
      { requestedBy: emp!._id, itemName: 'A', quantity: 1, status: 'pending' },
      { requestedBy: emp!._id, itemName: 'B', quantity: 2, status: 'approved' },
      { requestedBy: emp!._id, itemName: 'C', quantity: 3, status: 'rejected' },
    ]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.totalRequests).toBe(3);
    expect(res.body.pending).toBe(1);
    expect(res.body.approved).toBe(1);
    expect(res.body.rejected).toBe(1);
    expect(res.body.inventoryCount).toBeDefined();
  });
});
