# Nexus SSO Setup Guide

**EMZI Nexus Booking** integrates with **EMZI Nexus Brain** (the parent identity hub) via JWT-based SSO. Nexus signs tokens with a shared secret; this app verifies them and issues a local JWT session.

---

## How It Works

```
Nexus Brain                          EMZI Nexus Booking
───────────                          ──────────────────
User clicks app tile    ──►   GET /sso/nexus?token=<JWT>&redirect_to=/calendar
                                      │
                                      ▼
                              POST /api/sso/nexus/verify  { token }
                                      │
                              Verify HMAC signature, iss, exp
                              Find or create user (nexus_sso_id)
                              Issue JWT Bearer token
                                      │
                                      ▼
                              Redirect to /calendar (or redirect_to)
```

**Inbound SSO** (Nexus → Booking): Nexus redirects users to `/sso/nexus` with a signed JWT.

**Outbound link** (Booking → Nexus): The login page includes a “Continue with EMZI Nexus Brain” link that sends users to the Nexus Brain URL (`VITE_NEXUS_BRAIN_URL`).

---

## Prerequisites

### 1. Run migrations

SSO requires the `nexus_sso_id` column on `users` and a default `nexus_sso` row in `settings`:

```bash
npm run migrate
```

Both are defined in `server/schema.sql` (including the `INSERT IGNORE` default for `nexus_sso`).

### 2. Default config

Fresh installs get a disabled SSO config:

| Field | Default |
|-------|---------|
| `enabled` | `false` |
| `secret` | `""` |
| `issuer` | `""` |
| `default_role` | `"user"` |
| `default_role_id` | `null` |

### 3. Production frontend routing

The SSO landing page is a React route (`/sso/nexus`). Your web server must serve `index.html` for client-side routes, for example:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Setup Methods

### Method 1 — Admin UI (recommended)

Best for day-to-day configuration. Requires an **admin** user (`role = admin`).

1. Log in as an admin.
2. Open **Settings** → **SSO** tab.
3. Configure:

   | Setting | Description |
   |---------|-------------|
   | **Enable Nexus SSO** | Must be on or verification returns `422 SSO is not configured.` |
   | **SSO Endpoint** | Copy this URL into Nexus Brain (shown as `{origin}/sso/nexus`). |
   | **API Key (Shared Secret)** | Min. 32 characters. Must match the secret configured in Nexus Brain for this connected system. Use **Generate** or paste a key from Nexus. |
   | **Expected Issuer URL** | Nexus Brain base URL (e.g. `https://emzinexus.com`). JWT `iss` claim must match exactly. Leave empty to skip issuer validation. |
   | **Default role for new SSO users** | Built-in `user` / `admin`, or a custom role from the **Roles** page. |

4. Click **Save SSO Settings**.

Config is stored in the `settings` table with key `nexus_sso` and JSON shape:

```json
{
  "enabled": true,
  "secret": "<shared-secret>",
  "issuer": "https://emzinexus.com",
  "default_role": "user",
  "default_role_id": null
}
```

The API never returns the secret on read; it exposes `secret_set: true` when a valid secret is saved.

---

### Method 2 — REST API (`/api/settings`)

Authenticated admins can update SSO config via the settings endpoint.

**Read settings (secret redacted):**

```http
GET /api/settings
Authorization: Bearer <admin-token>
```

**Update:**

```http
PATCH /api/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "nexus_sso": {
    "enabled": true,
    "secret": "<min-32-char-secret>",
    "issuer": "https://emzinexus.com",
    "default_role": "user",
    "default_role_id": null
  }
}
```

Omit `secret` or send an empty string to keep the existing secret. Use `default_role_id` (UUID from `roles` table) for custom roles, or `default_role` (`user` / `admin`) for built-in roles.

---

### Method 3 — Direct database update

Useful for automation or when the UI is unavailable:

```sql
INSERT INTO settings (`key`, `value`) VALUES (
  'nexus_sso',
  '{"enabled":true,"secret":"your-shared-secret-at-least-32-chars","issuer":"https://emzinexus.com","default_role":"user","default_role_id":null}'
)
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`);
```

---

## Nexus Brain Side Configuration

In **EMZI Nexus Brain** (Connected Systems):

1. Add or edit this app as a connected system.
2. Set **Base URL / SSO Endpoint** to:
   ```
   https://<your-booking-frontend-domain>/sso/nexus
   ```
3. Set **API Key** to the same value as Booking’s shared secret.
4. Ensure Nexus signs JWTs with:
   - Algorithm: **HS256** (HMAC-SHA256 over `header.payload`)
   - Secret: the shared API key

Example redirect URL Nexus should send users to:

```
https://booking.example.com/sso/nexus?token=<JWT>&redirect_to=/calendar
```

Optional query parameters:

| Param | Description |
|-------|-------------|
| `redirect_to` | Preferred post-login path (e.g. `/bookings`) |
| `return_to` | Stored for post-logout redirect back to Nexus |

The JWT payload may also include a `redirect_to` claim; the server sanitizes the final redirect before responding.

---

## Frontend Environment (outbound login)

Set in the project root `.env` before building the frontend:

```env
VITE_NEXUS_BRAIN_URL=https://emzinexus.com
VITE_API_URL=https://api.booking.example.com/api
```

| Variable | Purpose |
|----------|---------|
| `VITE_NEXUS_BRAIN_URL` | Target for “Continue with EMZI Nexus Brain” on the login page. Default if unset: `https://emzinexus.com` (`src/lib/nexusBrain.js`). |
| `VITE_API_URL` | Backend API base used by the SSO landing page. Leave blank in dev to use Vite’s `/api` proxy. |

This does **not** configure inbound SSO verification; that is entirely the backend `nexus_sso` setting.

---

## JWT Token Requirements

Nexus must issue a standard three-part JWT (`header.payload.signature`).

### Signature

```
signature = base64url( HMAC-SHA256( "<header>.<payload>", secret ) )
```

Verified in `server/nexusJwt.js`.

### Required claims

| Claim | Purpose |
|-------|---------|
| `sub` | Nexus user ID (stored as `users.nexus_sso_id`) |
| `email` | Valid email address |
| `exp` | Unix timestamp; must be in the future |

### Optional claims

| Claim | Purpose |
|-------|---------|
| `iss` | Must match configured issuer if issuer is set |
| `name` | Display name; falls back to email (`users.full_name`) |
| `redirect_to` | Post-login redirect (sanitized server-side) |
| `return_to` | Post-logout redirect target (returned to frontend) |

---

## User Provisioning

On successful verification (`POST /api/sso/nexus/verify`):

1. Lookup by `nexus_sso_id` (`sub` claim).
2. If not found, lookup by `email`.
3. If found: update `nexus_sso_id`, `full_name`, and `email`.
4. If not found: create user with:
   - Random password hash (not used for SSO login)
   - `approved`: `1` (skips manual admin approval)
   - Role from `default_role_id` / `default_role` in config, else built-in `user`

Existing users who are not approved (`approved = 0`) fail with `403 User account is not active.`

SSO sign-in and auto-registration are written to the audit log as `sso_login` and `sso_register`.

---

## Backend Environment

Ensure these are set for correct redirects and CORS in production:

```env
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=https://booking.example.com
```

`FRONTEND_URL` supports comma-separated origins for CORS and is used when sanitizing absolute `redirect_to` URLs in JWT claims.

---

## API Reference

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /sso/nexus?token=…` | Public | Frontend SSO handler; calls verify API |
| `POST /api/sso/nexus/verify` | Public | Validates JWT, returns JWT token + user |
| `GET /api/settings` | Admin | Read settings (includes `nexus_sso`, secret redacted) |
| `PATCH /api/settings` | Admin | Update `nexus_sso` config |

Verify endpoint is rate-limited to **10 requests/minute** per IP.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `SSO is not configured` | SSO disabled or empty secret | Enable SSO and set API key (≥ 32 chars) in Settings |
| `Invalid token signature` | Secret mismatch between Nexus and Booking | Align API keys on both sides |
| `Invalid token issuer` | `iss` claim ≠ Expected Issuer URL | Match issuer URL or clear issuer field to disable check |
| `Token has expired` | JWT `exp` in the past | Nexus must issue fresh tokens |
| `Token missing sub claim` | No Nexus user ID in JWT | Nexus must include `sub` |
| `User account is not active` | User not approved in Booking | Approve user in **Users** |
| Blank page at `/sso/nexus` | SPA not configured for client routing | Ensure web server serves `index.html` for unknown paths |
| API errors from SSO page | Wrong `VITE_API_URL` or CORS | Set `VITE_API_URL` and backend `FRONTEND_URL` for production |

---

## Related Code

| Area | Location |
|------|----------|
| SSO verification route | `server/routes/sso.js` |
| JWT verification | `server/nexusJwt.js` |
| Redirect sanitization | `server/ssoRedirect.js` |
| SSO landing page | `src/pages/SsoNexus.jsx` |
| Admin settings UI | `src/pages/Settings.jsx` (`NexusSsoSettings`) |
| Frontend redirect helpers | `src/lib/ssoRedirect.js` |
| Nexus Brain URL / logout | `src/lib/nexusBrain.js` |
| Database schema | `server/schema.sql` |
| Outgoing event webhooks (`nexus_sso_id`) | `server/webhooks.js` — see [event-webhook-setup.md](./event-webhook-setup.md) |
