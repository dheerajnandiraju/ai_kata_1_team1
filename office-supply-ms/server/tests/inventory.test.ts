import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/server';
import { User } from '../src/modules/user/model';
import { InventoryItem } from '../src/modules/inventory/model';

async function getAdminToken() {
  await User.deleteMany({ email: 'admin_inv@test.com' });
  const hash = await bcrypt.hash('Admin@12345', 12);
  await User.create({ name: 'Admin', email: 'admin_inv@test.com', passwordHash: hash, role: 'admin' });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin_inv@test.com', password: 'Admin@12345' });
  return res.body.accessToken as string;
}

describe('Inventory (AC-04)', () => {
  let token: string;

  beforeEach(async () => {
    await InventoryItem.deleteMany({});
    token = await getAdminToken();
  });

  it('AC-04: admin can add and list inventory items', async () => {
    await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Stapler', quantity: 10 })
      .expect(201);

    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].name).toBe('Stapler');
    expect(res.body.items[0].quantity).toBe(10);
  });

  it('AC-04: admin can update item quantity', async () => {
    const addRes = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pen', quantity: 20 });

    const id = addRes.body.item._id;

    const patchRes = await request(app)
      .patch(`/api/inventory/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 50 })
      .expect(200);

    expect(patchRes.body.item.quantity).toBe(50);

    const listRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updated = listRes.body.items.find((item: any) => item._id === id);
    expect(updated?.quantity).toBe(50);
  });

  it('AC-12: employee cannot access inventory admin routes', async () => {
    const hash = await bcrypt.hash('emp123', 12);
    await User.create({ name: 'Emp', email: 'emp_inv@test.com', passwordHash: hash, role: 'employee' });
    const empRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emp_inv@test.com', password: 'emp123' });
    const empToken = empRes.body.accessToken;

    await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ name: 'Scissors', quantity: 5 })
      .expect(403);
  });
});
