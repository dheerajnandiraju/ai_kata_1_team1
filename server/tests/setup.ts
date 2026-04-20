/**
 * Jest global test setup
 *
 * Must run before any test module is loaded so that env.ts
 * (which calls strongSecret() at import time) does not throw.
 *
 * This file is listed under "setupFiles" in jest config so it
 * executes in the test worker before any describe/it blocks.
 */

// JWT secrets — minimum 32 chars required by strongSecret()
process.env.JWT_SECRET          = 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET  = 'b'.repeat(64);
process.env.SEED_ADMIN_PASSWORD = 'TestAdmin@123';
process.env.NODE_ENV            = 'test';

// Point at the local test database so we never touch production data.
// Override with MONGODB_URI env var for CI environments.
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/osms_test';
