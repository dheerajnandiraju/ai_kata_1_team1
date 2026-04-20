---
name: security-review
description: >
  Performs a structured OWASP Top 10 security review of implemented code.
  Only load this skill during the review phase or when the user explicitly
  asks for a security audit. Do not load it during workflow startup,
  requirements, architecture, coding, integration-testing, or testing.
user-invocable: true
disable-model-invocation: true
---

# Security Review Skill

## Phase Gate

Load this skill only when `review-agent` is performing the final audit or when
the user explicitly asks for a security review.

Do not load this skill during `/start-multi-agent-flow`, mode selection,
requirements, architecture, coding, integration-testing, or testing.

You are a security auditor. When invoked, perform a systematic check against the OWASP Top 10 (2021).

## Checklist

For each item below, search the codebase with `#codebase` and report: **PASS**, **FAIL**, or **NOT APPLICABLE** with evidence.

### A01 — Broken Access Control
- [ ] Are all API endpoints protected with authentication/authorization checks?
- [ ] Is there horizontal privilege escalation risk (user A accessing user B's data)?
- [ ] Are directory listings disabled?

### A02 — Cryptographic Failures
- [ ] Are passwords hashed with bcrypt/argon2/scrypt (NOT MD5/SHA1)?
- [ ] Is sensitive data encrypted at rest and in transit (TLS/HTTPS)?
- [ ] Are secrets stored in env vars or a secrets manager, NOT in source code?

### A03 — Injection
- [ ] Are all database queries parameterized (no string concatenation with user input)?
- [ ] Are shell commands constructed with parameterized APIs (no `exec(userInput)`)?
- [ ] Is user input HTML-escaped before rendering in templates?

### A04 — Insecure Design
- [ ] Is there rate limiting on authentication and sensitive endpoints?
- [ ] Is there input validation at the API boundary (not just client-side)?

### A05 — Security Misconfiguration
- [ ] Are default credentials changed?
- [ ] Are debug endpoints and verbose error messages disabled in production?
- [ ] Are CORS policies restrictive (not `*`)?

### A06 — Vulnerable and Outdated Components
- [ ] Run `npm audit` or equivalent; report HIGH/CRITICAL advisories.
- [ ] Use `web/fetch` to check NVD (https://nvd.nist.gov) for direct dependency CVEs.

### A07 — Identification and Authentication Failures
- [ ] Are session tokens sufficiently random and rotated on privilege change?
- [ ] Is there brute-force protection on login?

### A08 — Software and Data Integrity Failures
- [ ] Are dependencies locked (lockfile present and committed)?
- [ ] Is there CI signature/hash verification for downloaded artifacts?

### A09 — Security Logging and Monitoring Failures
- [ ] Are failed authentication attempts logged?
- [ ] Are logs shipped to a monitoring system (not discarded)?

### A10 — Server-Side Request Forgery (SSRF)
- [ ] Is user-supplied URL input validated/allowlisted before making server-side requests?

## Output Format

Produce a security findings table:

| OWASP ID | Finding | Severity | File:Line | Recommendation |
|----------|---------|----------|-----------|----------------|
| A03      | SQL concatenation in userRepo.ts | HIGH | src/userRepo.ts:42 | Use parameterized query |

Then state overall security posture: **PASS** (no HIGH/CRITICAL) or **FAIL** (any HIGH/CRITICAL present).

If FAIL: the review-agent must set recommendation to `changes required`.
