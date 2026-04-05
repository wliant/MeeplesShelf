# MeeplesShelf — Authentication

MeeplesShelf uses a single shared admin password model — there are no individual user accounts. Access is one of three states: **admin**, **guest**, or **unauthenticated**.

---

## Roles

| Role | How obtained | Token | Capabilities |
|---|---|---|---|
| `admin` | Correct password via `POST /api/auth/token` | JWT stored in `localStorage` | Full read + write access to all endpoints |
| `guest` | Click "Continue as Guest" on login page | None | Read-only access to public API endpoints; all write UI controls hidden |
| *(unauthenticated)* | No stored role | None | Redirected to `/login` by `RequireAuth` |

---

## Server-Side: JWT Issuance

### Endpoint

`POST /api/auth/token`

### Request

```json
{ "password": "<string>" }
```

### Validation

The provided password is compared directly against `settings.admin_password` (loaded from `APP_ADMIN_PASSWORD`). No rate limiting or account lockout is implemented.

### Token

On success, a JWT is issued with the following properties:

| Property | Value |
|---|---|
| Algorithm | `HS256` |
| Signing key | `settings.secret_key` (`APP_SECRET_KEY`) |
| `sub` claim | `"admin"` |
| `exp` claim | `datetime.now(UTC) + 24 hours` |

### Response

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

HTTP status: `200 OK` on success, `401 Unauthorized` on wrong password.

---

## Server-Side: Request Authorization

The `require_admin` FastAPI dependency (`app/app/dependencies.py`) is applied to all write endpoints.

### Logic

1. Extract Bearer token from `Authorization: Bearer <token>` header via `HTTPBearer(auto_error=False)`.
2. If no credentials present → `401 Unauthorized` (`{"detail": "Not authenticated"}`).
3. Decode the JWT using `APP_SECRET_KEY` and `HS256`.
4. If decoding fails (invalid signature, expired, malformed) → `401 Unauthorized` (`{"detail": "Invalid or expired token"}`).
5. If `payload["sub"] != "admin"` → `403 Forbidden` (`{"detail": "Forbidden"}`).
6. Otherwise pass — the request proceeds.

### Protected vs Public Endpoints

| Protected (require admin) | Public (no auth) |
|---|---|
| `POST /api/games` | `GET /api/games` |
| `PUT /api/games/{id}` | `GET /api/games/{id}` |
| `DELETE /api/games/{id}` | `GET /api/players` |
| `POST /api/games/{id}/expansions` | `GET /api/sessions` |
| `DELETE /api/games/{id}/expansions/{eid}` | `GET /api/sessions/{id}` |
| `POST /api/seed` | — |
| `POST /api/players` | — |
| `POST /api/sessions` | — |
| `DELETE /api/sessions/{id}` | — |

---

## Client-Side: Login Flow

### Admin Login

1. User enters password on `LoginPage` and clicks "Login as Admin".
2. Frontend calls `POST /api/auth/token` with `{ password }`.
3. On success:
   - Store `access_token` in `localStorage` under key `ms_token`.
   - Store `"admin"` in `localStorage` under key `ms_role`.
   - Set React state `role = "admin"`.
   - Navigate to `/inventory`.
4. On failure (HTTP 401):
   - Display error alert: "Incorrect password".
   - Do not navigate.

### Guest Login

1. User clicks "Continue as Guest" on `LoginPage`.
2. No API call is made.
3. Store `"guest"` in `localStorage` under key `ms_role`.
4. Set React state `role = "guest"`.
5. Navigate to `/inventory`.

### Logout

1. User clicks "Logout" in the app bar.
2. Remove `ms_token` and `ms_role` from `localStorage`.
3. Set React state `role = null`.
4. Navigate to `/login`.

---

## Client-Side: Token Attachment

An Axios request interceptor (`web/src/api/client.ts`) runs before every API call:

```ts
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("ms_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Guest users have no `ms_token` so no `Authorization` header is sent. Attempts to call protected endpoints as a guest will receive `401` from the server.

---

## Client-Side: Session Persistence

Both `ms_role` and `ms_token` are persisted in `localStorage`. On page load, `AuthContext` reads `ms_role` from `localStorage` to initialise the `role` state — so auth survives browser refreshes without requiring a re-login.

```ts
function readStoredRole(): Role {
  const stored = localStorage.getItem("ms_role");
  if (stored === "admin" || stored === "guest") return stored;
  return null;
}
```

---

## Client-Side: Route Protection

`RequireAuth` (`web/src/components/auth/RequireAuth.tsx`) wraps all protected routes:

```tsx
export default function RequireAuth() {
  const { role } = useAuth();
  if (role === null) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

Unauthenticated users (role `null`) are unconditionally redirected to `/login`. Both `admin` and `guest` roles pass through.

---

## `AuthContext` API

Provided by `AuthProvider` (`web/src/context/AuthContext.tsx`).

| Value | Type | Description |
|---|---|---|
| `role` | `"admin" \| "guest" \| null` | Current auth state |
| `isAdmin` | `boolean` | `role === "admin"` |
| `login(token)` | `(string) => void` | Store token + set admin role |
| `enterAsGuest()` | `() => void` | Set guest role (no token) |
| `logout()` | `() => void` | Clear role + token |

---

## localStorage Keys

| Key | Values | Notes |
|---|---|---|
| `ms_role` | `"admin"` \| `"guest"` \| *(absent)* | Determines route access on page load |
| `ms_token` | JWT string \| *(absent)* | Sent as Bearer token on every request when present |

---

## Environment Variables

| Variable | Description |
|---|---|
| `APP_ADMIN_PASSWORD` | The shared admin password validated on `POST /api/auth/token` |
| `APP_SECRET_KEY` | HMAC-SHA256 key used to sign and verify JWTs. Use a long random string (≥32 bytes recommended). |
