import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { User } from '../src/modules/user/model';

describe('Auth (AC-01, AC-12, AC-13)', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('AC-01: registers a new employee and logs in', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'pass1234' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'pass1234' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('employee');
  });

  it('AC-01: invalid credentials return 401', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' })
      .expect(401);
  });

  it('AC-12: protected route without token returns 401', async () => {
    await request(app).get('/api/inventory').expect(401);
  });

  it('AC-13: stored password is bcrypt hash', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Hash Test', email: 'hash@test.com', password: 'mypassword' });
    const user = await User.findOne({ email: 'hash@test.com' });
    expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
  });
});
