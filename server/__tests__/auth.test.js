const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'office_supply_db_test',
  });
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('POST /api/auth/register', () => {
  it('should register a new user and return a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'employee1',
      password: 'pass123',
      name: 'Test Employee',
      role: 'employee',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      username: 'employee1',
      name: 'Test Employee',
      role: 'employee',
    });
  });

  it('should return 400 for duplicate username', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'employee1',
      password: 'pass123',
      name: 'Test Employee',
      role: 'employee',
    });

    const res = await request(app).post('/api/auth/register').send({
      username: 'employee1',
      password: 'pass456',
      name: 'Another Employee',
      role: 'employee',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Username already exists');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      username: 'employee1',
      password: 'pass123',
      name: 'Test Employee',
      role: 'employee',
    });
  });

  it('should login successfully and return a token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'employee1',
      password: 'pass123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      username: 'employee1',
      role: 'employee',
    });
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'employee1',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'employee1',
      password: 'pass123',
      name: 'Test Employee',
      role: 'employee',
    });
    token = res.body.token;
  });

  it('should return the current user with a valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      username: 'employee1',
      name: 'Test Employee',
      role: 'employee',
    });
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'No token provided');
  });
});
