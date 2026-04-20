import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app';
import { User } from '../../src/modules/user/model';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

beforeAll(async () => { await mongoose.connect(MONGO_URI); });
afterEach(async () => { await User.deleteMany({}); await RefreshToken.deleteMany({}); });
afterAll(async () => { await User.deleteMany({}); await RefreshToken.deleteMany({}); await mongoose.disconnect(); });

// ─── Helpers ────────────────────────────────────────────────────────────────
async function registerAndLogin(email = 'emp@test.com', password = 'pass1234') {
  await request(app).post('/api/auth/register').send({ name: 'Test', email, password });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body as { accessToken: string; user: { role: string } };
}

// ─── Health ──────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ─── Register ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('201 — creates user and returns accessToken', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice', email: 'alice@test.com', password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('employee');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('201 — sets HttpOnly refreshToken cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob', email: 'bob@test.com', password: 'password123',
    });
    expect(res.status).toBe(201);
    const rawCookie = res.headers['set-cookie'];
    const cookieArr = Array.isArray(rawCookie) ? rawCookie : [rawCookie as string];
    expect(cookieArr.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
    expect(cookieArr.some((c: string) => c.includes('HttpOnly'))).toBe(true);
  });

  it('409 — duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'dup@test.com', password: 'pass1234' });
    const res = await request(app).post('/api/auth/register').send({ name: 'B', email: 'dup@test.com', password: 'pass1234' });
    expect(res.status).toBe(409);
  });

  it('422 — missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.com', password: 'pass1234' });
    expect(res.status).toBe(422);
  });

  it('422 — invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'notanemail', password: 'pass1234' });
    expect(res.status).toBe(422);
  });

  it('422 — password too short', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@test.com', password: '123' });
    expect(res.status).toBe(422);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({ name: 'User', email: 'user@test.com', password: 'correct123' });
  });

  it('200 — valid credentials return accessToken and user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'correct123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('user@test.com');
  });

  it('401 — wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('401 — non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'pass123' });
    expect(res.status).toBe(401);
  });

  it('422 — invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad-email', password: 'pass123' });
    expect(res.status).toBe(422);
  });

  it('does not return passwordHash in response', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'correct123' });
    expect(res.body.user?.passwordHash).toBeUndefined();
  });
});

// ─── Refresh ──────────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  it('200 — valid refresh cookie returns new accessToken', async () => {
    const loginRes = await request(app).post('/api/auth/register').send({ name: 'R', email: 'r@test.com', password: 'pass1234' });
    const rawCookie = loginRes.headers['set-cookie'];
    const cookies = Array.isArray(rawCookie) ? rawCookie : [rawCookie as string];
    const cookie = cookies.find((c: string) => c.startsWith('refreshToken='));
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie!);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('401 — no refresh cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('401 — invalid/tampered refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Cookie', 'refreshToken=invalidtoken');
    expect(res.status).toBe(401);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('204 — clears the refresh token cookie', async () => {
    const loginRes = await request(app).post('/api/auth/register').send({ name: 'L', email: 'l@test.com', password: 'pass1234' });
    const rawCookie = loginRes.headers['set-cookie'];
    const cookies = Array.isArray(rawCookie) ? rawCookie : [rawCookie as string];
    const cookie = cookies.find((c: string) => c.startsWith('refreshToken='));
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie!);
    expect(res.status).toBe(204);
  });

  it('204 — logout without cookie still succeeds', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});
