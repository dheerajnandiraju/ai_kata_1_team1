# Change Log

## Change Requests

### CHG-01 — Tech stack upgrade + feature enhancements

- **Requested change**: Replace SQLite with MongoDB 7 + Mongoose; use React 18 + Vite 5 for the frontend; add refresh-token rotation, dashboard stats, search/filter on history, low-stock alerts, audit trail, and toast notifications.
- **Rationale**: MongoDB provides atomic `$inc` for safe concurrent inventory deduction; Vite gives faster DX; additional features improve operational value.
- **Changed FR/NFR/AC IDs**: FR-02 (register + refresh tokens), FR-05–06 (admin inventory mgmt), FR-13–15 (new: dashboard stats, search/filter, toasts); NFR-03 (bcrypt cost 12), NFR-07–09 (new: CORS/helmet, concurrency, client+server validation); AC-01–AC-14 updated accordingly.
- **Impact summary**: Architecture changes required (MongoDB models, refresh-token endpoints, new API routes).
- **Rollback target**: `architecture-agent`
- **Affected artifacts**: `docs/01-requirements.md`, `docs/02-architecture.md`, all implementation modules.
- **Status**: applied