const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');
const SupplyRequest = require('../models/SupplyRequest');

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
  await SupplyRequest.deleteMany({});

  const adminRes = await request(app).post('/api/auth/register').send({
    username: 'admin1',
    password: 'admin123',
    name: 'Test Admin',
    role: 'admin',
  });
  adminToken = adminRes.body.token;

  const empRes = await request(app).post('/api/auth/register').send({
    username: 'employee1',
    password: 'pass123',
    name: 'Test Employee',
    role: 'employee',
  });
  employeeToken = empRes.body.token;

  await InventoryItem.create({
    itemName: 'Pens (Box of 50)',
    quantity: 100,
    description: 'Standard pens',
  });
});

describe('POST /api/requests', () => {
  it('should allow employee to create a supply request with status pending', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        itemName: 'Pens (Box of 50)',
        quantity: 5,
        remarks: 'Need for project',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      itemName: 'Pens (Box of 50)',
      quantity: 5,
      status: 'pending',
      remarks: 'Need for project',
    });
    expect(res.body).toHaveProperty('_id');
  });
});

describe('GET /api/requests', () => {
  it('should return only the employee own requests', async () => {
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ itemName: 'Pens (Box of 50)', quantity: 2, remarks: '' });

    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({
      itemName: 'Pens (Box of 50)',
      quantity: 2,
      status: 'pending',
    });
  });
});

describe('PATCH /api/requests/:id/approve', () => {
  it('should allow admin to approve a request and decrease inventory', async () => {
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ itemName: 'Pens (Box of 50)', quantity: 10, remarks: '' });

    const requestId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');

    const item = await InventoryItem.findOne({ itemName: 'Pens (Box of 50)' });
    expect(item.quantity).toBe(90);
  });

  it('should return 403 when employee tries to approve', async () => {
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ itemName: 'Pens (Box of 50)', quantity: 5, remarks: '' });

    const requestId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Access denied');
  });
});

describe('PATCH /api/requests/:id/reject', () => {
  it('should allow admin to reject a request with a reason', async () => {
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ itemName: 'Pens (Box of 50)', quantity: 5, remarks: '' });

    const requestId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'Budget exceeded' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(res.body.rejectionReason).toBe('Budget exceeded');
  });
});
