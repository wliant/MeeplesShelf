# Contributing to MeeplesShelf

Thanks for your interest in contributing. This document covers how to set up a development environment, the conventions used in this project, and the pull request process.

---

## Development Setup

Follow the [Getting Started](README.md#getting-started) section in the README to get the full stack running locally.

Quick reference:

```bash
# Start the database
docker compose up -d

# Backend
cd backend && pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

---

## Branch Naming

Use a short, descriptive name prefixed by type:

| Prefix      | Use for                                   |
|-------------|-------------------------------------------|
| `feature/`  | New features                              |
| `fix/`      | Bug fixes                                 |
| `docs/`     | Documentation changes                     |
| `chore/`    | Tooling, config, dependency updates       |
| `refactor/` | Code changes with no behaviour difference |

Example: `feature/player-profile-page`, `fix/session-delete-cascade`

---

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`

Examples:
```
feat(sessions): add notes field to session log
fix(scoring): handle missing score keys in expansion modifier
docs: update README quickstart steps
chore: bump MUI to 7.4
```

---

## Pull Requests

1. Branch off `main`.
2. Keep PRs focused — one logical change per PR.
3. Describe **what** changed and **why** in the PR description.
4. Link related issues with `Closes #<issue>` if applicable.
5. Ensure linting passes before opening a PR.

---

## Code Style

### Frontend

```bash
cd frontend
npm run lint       # ESLint check
```

- Use TypeScript; avoid `any`.
- Use `import type` for type-only imports.
- Components live in `src/components/`, pages in `src/pages/`.

### Backend

- All functions and method signatures must have type hints.
- Follow standard Python conventions (PEP 8).
- Use async functions for all database operations.
- Schemas (Pydantic) live in `app/schemas/`; ORM models in `app/models/`.

---

## Database Migrations

Any change to the database schema requires an Alembic migration:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Commit the generated migration file alongside your code changes.

---

## Reporting Issues

- **Bug report**: describe the steps to reproduce, expected vs actual behaviour, and your environment.
- **Feature request**: describe the problem you're trying to solve and your proposed solution.

Open issues at: https://github.com/wliant/MeeplesShelf/issues
