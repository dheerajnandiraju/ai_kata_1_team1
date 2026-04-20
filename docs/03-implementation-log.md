# Implementation Log

## M-11 Server Startup Reliability Fix
- server/package.json — added prestart script to run build before start so npm start regenerates dist/server.js when dist is missing
- server/src/server.ts import audit — all route and middleware import targets already existed; no placeholder modules were required
- Decision: keep existing start command and use npm lifecycle hook for reliable startup without changing runtime behavior

## M-02 User Model + Seed

## Module: M-03
- Files changed: office-supply-ms/server/src/modules/auth/controller.ts, office-supply-ms/server/src/modules/auth/service.ts, office-supply-ms/server/src/modules/auth/tokenModel.ts, office-supply-ms/server/src/modules/middleware/authenticate.ts, office-supply-ms/server/src/modules/middleware/requireRole.ts
- Test coverage needed: AC-Auth-Login, AC-Auth-RefreshRotation, AC-Auth-BearerValidation, AC-Auth-RBAC
- Notes: Implemented one-time refresh token rotation with hash-at-rest storage, refresh cookie renewal on refresh endpoint, strict empty-bearer token rejection, and normalized RBAC role checks. Residual risk: no explicit replay-detection telemetry for unknown refresh hashes.
- server/src/modules/user/model.ts — IUser interface, Mongoose schema (email, passwordHash, role, name, timestamps)
- server/src/modules/user/seed.ts — seeds admin@company.com and employee@company.com at startup
- server/src/modules/auth/tokenModel.ts — RefreshToken model with TTL index for auto-expiry
- Decision: bcrypt cost factor 12, TTL index on RefreshToken.expiresAt for automatic cleanup

## M-10 DevOps Bootstrap
- Created office-supply-ms/ project skeleton
- Files: docker-compose.yml, .env.example, docker/server.Dockerfile, docker/client.Dockerfile, docker/nginx.conf
- Server: package.json, tsconfig.json, src/server.ts, vitest.config.ts, tests/setup.ts
- Client: package.json, tsconfig.json, vite.config.ts, tailwind.config.js, postcss.config.js, index.html, src/main.tsx, src/index.css, src/App.tsx (placeholder)
- Decision: server uses CommonJS (type: "commonjs") for Mongoose compatibility

## Summary

## Files Changed

## Technical Decisions

## Test Impact

## Follow-Up Work
