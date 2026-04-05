Read `specs/future/feature-gaps.md`, identify the 1 highest priority item that is not yet marked as Done (P0 > P1 > P2; prefer lower complexity and fewer dependencies when priorities are equal), analyze it, and implement it end-to-end.

## Principles

- Leave nothing to assumption — always clarify ambiguities with the user before proceeding.
- Implementation must consider maintainability, testability, observability, and deployability.
- Pure functions for business logic in services/utils; wire into routers/components separately.
- Backend is authoritative for scoring and validation; frontend mirrors logic for live preview.
- Watch for async ORM pitfalls — never access unloaded SQLAlchemy relationships on newly-created objects; use local variables instead.

## Implementation Workflow

### 1. Explore and Understand

- Read `specs/future/feature-gaps.md` and identify the target gap.
- Read all critical files involved: models, routers, schemas, services, frontend components, types, utils.
- Read relevant specs (`specs/api.md`, `specs/data-model.md`, `specs/scoring-system.md`, `specs/ui.md`, `specs/authentication.md`, `specs/overview.md`) to understand what they currently document.
- Clarify anything unclear with the user.

### 2. Plan

- Design the implementation in detail: what changes, where, and why.
- Identify edge cases and backward-compatibility concerns.
- Confirm the plan with the user before writing code.

### 3. Implement

- Backend first (services, then routers/schemas), then frontend (utils, then components).
- Add observability (logging) where appropriate.
- Validate inputs at API boundaries (e.g., reject invalid foreign keys with HTTP 400).

### 4. Test — Full Pyramid Required

Every implementation must include all three test layers:

**Backend unit tests** (`app/tests/`):
- Framework: pytest, added via `[dependency-groups] dev` in `app/pyproject.toml`.
- Run: `cd app && uv run --group dev pytest -v`

**Frontend unit tests** (`web/src/**/*.test.ts`):
- Framework: vitest, configured in `web/vite.config.ts` and `web/tsconfig.app.json`.
- Run: `cd web && npm test`

**E2e integration tests** (`e2e-test/tests/`):
- Framework: pytest + httpx + python-dotenv.
- Must load the project root `.env` file via `python-dotenv` for `APP_ADMIN_PASSWORD`, `APP_PORT`, etc. Never hardcode credentials.
- Run: `cd e2e-test && uv run pytest -v`

### 5. Rebuild and Verify

- Rebuild Docker: `docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up -d --build`
- Run all three test suites and confirm green.
- Verify TypeScript compiles: `cd web && npx tsc -b`

### 6. Update Feature Gaps Spec

After implementation is complete, update `specs/future/feature-gaps.md`:

- Mark the gap's heading with strikethrough and `(Done)`: `### ~~Gap N — Title~~ (Done)`
- Replace the description with a **Status** paragraph summarizing what was implemented, which files were changed, and what tests cover it.
- Change the priority in the attributes table to `~~P0~~ Done`.
- Update the summary table row with strikethrough on the feature name and `~~P0~~ Done` in the priority column.

### 7. Update Actual Specs

Review and update the relevant specification files in `specs/` to reflect the new reality:

- **`specs/api.md`** — document any new or changed API endpoints, request/response schemas, query parameters, or error codes.
- **`specs/data-model.md`** — document any new tables, columns, relationships, or changes to existing schema.
- **`specs/scoring-system.md`** — document any changes to scoring logic, new field types, or calculation behavior.
- **`specs/ui.md`** — document any new UI components, pages, dialogs, form fields, or interaction flows.
- **`specs/authentication.md`** — document any changes to auth flow, permissions, or access control.
- **`specs/overview.md`** — update the high-level summary if the change affects the application's overall capabilities or architecture.

Only update specs that are actually affected by the implementation. Read each spec file before editing to understand its structure and conventions, then add/modify sections to match.
