const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');

let adminToken;
let employeeToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'office_supply_db_test',
  });
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
  await InventoryItem.deleteMany({});

  // Create admin user
  const adminRes = await request(app).post('/api/auth/register').send({
    username: 'admin1',
    password: 'admin123',
    name: 'Test Admin',
    role: 'admin',
  });
  adminToken = adminRes.body.token;

  // Create employee user
  const empRes = await request(app).post('/api/auth/register').send({
    username: 'employee1',
    password: 'pass123',
    name: 'Test Employee',
    role: 'employee',
  });
  employeeToken = empRes.body.token;

  // Seed a sample inventory item
  await InventoryItem.create({
    itemName: 'Pens (Box of 50)',
    quantity: 100,
    description: 'Standard ballpoint pens',
  });
});

describe('GET /api/inventory', () => {
  it('should return 200 with inventory items for admin', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({
      itemName: 'Pens (Box of 50)',
      quantity: 100,
    });
  });

  it('should return 403 for employee', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Access denied');
  });
});

describe('POST /api/inventory', () => {
  it('should allow admin to create a new inventory item', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemName: 'A4 Paper Ream',
        quantity: 50,
        description: 'Standard A4 paper',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      itemName: 'A4 Paper Ream',
      quantity: 50,
    });
  });
});

describe('PUT /api/inventory/:id', () => {
  it('should allow admin to update an inventory item', async () => {
    const item = await InventoryItem.findOne({ itemName: 'Pens (Box of 50)' });

    const res = await request(app)
      .put(`/api/inventory/${item._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemName: 'Pens (Box of 50)',
        quantity: 200,
        description: 'Updated description',
      });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(200);
    expect(res.body.description).toBe('Updated description');
  });
});

describe('DELETE /api/inventory/:id', () => {
  it('should allow admin to delete an inventory item', async () => {
    const item = await InventoryItem.findOne({ itemName: 'Pens (Box of 50)' });

    const res = await request(app)
      .delete(`/api/inventory/${item._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Item deleted successfully');

    const remaining = await InventoryItem.countDocuments();
    expect(remaining).toBe(0);
  });
});
