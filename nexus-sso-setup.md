# Nexus SSO Setup Guide

EMZI Nexus Care integrates with **EMZI Nexus Brain** (the parent identity hub) via JWT-based SSO. Nexus signs tokens with a shared secret; this app verifies them and issues a local Sanctum session.

---

## How It Works

```
Nexus Brain                          EMZI Nexus Care
───────────                          ───────────────
User clicks app tile    ──►   GET /sso/nexus?token=<JWT>&redirect_to=/dashboard
                                      │
                                      ▼
                              POST /api/v1/sso/nexus/verify  { token }
                                      │
                              Verify HMAC signature, iss, exp
                              Find or create user (nexus_sso_id)
                              Issue Sanctum Bearer token
                                      │
                                      ▼
                              Redirect to /dashboard (or redirect_to)
```

**Inbound SSO** (Nexus → Care): Nexus redirects users to `/sso/nexus` with a signed JWT.

**Outbound link** (Care → Nexus): Login/Register pages include a “Continue with EMZI Nexus Brain” button that sends users to the Nexus Brain URL (`VITE_NEXUS_BRAIN_URL`).

---

## Prerequisites

### 1. Run migrations

SSO requires the `nexus_sso_id` column on `users` and the `nexus_sso` row in `system_configs`:

```bash
cd backend
php artisan migrate
```

Migration: `backend/database/migrations/2026_06_13_000001_add_nexus_sso_id_to_users.php`

### 2. Seed default config (optional)

Fresh installs get a disabled SSO config from the seeder:

```bash
php artisan db:seed
```

Default `system_configs` entry (`key = nexus_sso`):

| Field | Default |
|-------|---------|
| `enabled` | `false` |
| `secret` | `""` |
| `issuer` | `""` |
| `default_role_id` | Viewer role ID |

### 3. Production frontend routing

The SSO landing page is a React route (`/sso/nexus`). Nginx must serve `index.html` for unknown paths (see `deploy/nginx/care.conf`):

```nginx
try_files $uri $uri/ /index.html;
```

---

## Setup Methods

### Method 1 — Admin UI (recommended)

Best for day-to-day configuration. Requires a user with the `settings.manage` permission (Super Admin / Admin roles).

1. Log in as an admin.
2. Open **Settings**.
3. Find **Nexus SSO Integration** and click the edit (pencil) icon.
4. Configure:

   | Setting | Description |
   |---------|-------------|
   | **API Key (Shared Secret)** | Min. 32 characters. Must match the secret configured in Nexus Brain for this connected system. Use **Generate** or paste a key from Nexus. |
   | **Expected Issuer URL** | Nexus Brain base URL (e.g. `https://emzinexus.com`). JWT `iss` claim must match exactly. Leave empty to skip issuer validation. |
   | **Enable Nexus SSO** | Must be checked or verification returns `422 SSO is not configured.` |

5. Copy the **SSO Endpoint** shown in the dialog: `{your-frontend-origin}/sso/nexus`
6. Save.

Config is stored in `system_configs` with key `nexus_sso` and JSON shape:

```json
{
  "enabled": true,
  "secret": "<shared-secret>",
  "issuer": "https://emzinexus.com",
  "default_role": "viewer"
}
```

The UI maps `api_key` ↔ `secret` and `issuer_url` ↔ `issuer` when reading/writing.

---

### Method 2 — Database seeder (initial / dev)

On first `php artisan db:seed`, a disabled `nexus_sso` config is created automatically. Edit values afterward via the UI or SQL.

To reset to seeded defaults on a fresh database, re-run migrations and seeders (destructive only on empty DB due to `firstOrCreate`).

---

### Method 3 — REST API (`system-configs`)

Authenticated admins can create or update the config via the API.

**Find existing config:**

```http
GET /api/v1/system-configs
Authorization: Bearer <admin-token>
```

**Create:**

```http
POST /api/v1/system-configs
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "key": "nexus_sso",
  "label": "Nexus SSO Settings",
  "json_value": {
    "enabled": true,
    "secret": "<min-32-char-secret>",
    "issuer": "https://emzinexus.com",
    "default_role_id": 7
  }
}
```

**Update:**

```http
PATCH /api/v1/system-configs/{id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "json_value": {
    "enabled": true,
    "secret": "<shared-secret>",
    "issuer": "https://emzinexus.com",
    "default_role_id": 7
  }
}
```

Use `default_role_id` (numeric role ID) or `default_role` (slug, e.g. `viewer`, `customer_service`). New SSO users receive this role on first login.

---

### Method 4 — Direct database update

Useful for automation or when the UI is unavailable:

```sql
UPDATE system_configs
SET json_value = JSON_OBJECT(
  'enabled', true,
  'secret', 'your-shared-secret-at-least-32-chars',
  'issuer', 'https://emzinexus.com',
  'default_role_id', (SELECT id FROM roles WHERE slug = 'viewer' LIMIT 1)
),
updated_at = NOW()
WHERE `key` = 'nexus_sso';
```

If no row exists, insert one matching the seeder structure in `backend/database/seeders/DatabaseSeeder.php`.

---

## Nexus Brain Side Configuration

In **EMZI Nexus Brain** (Connected Systems):

1. Add or edit this app as a connected system.
2. Set **Base URL / SSO Endpoint** to:
   ```
   https://<your-care-frontend-domain>/sso/nexus
   ```
3. Set **API Key** to the same value as Care’s shared secret.
4. Ensure Nexus signs JWTs with:
   - Algorithm: **HS256** (HMAC-SHA256 over `header.payload`)
   - Secret: the shared API key

Example redirect URL Nexus should send users to:

```
https://care.example.com/sso/nexus?token=<JWT>&redirect_to=/dashboard
```

Optional query parameters:

| Param | Description |
|-------|-------------|
| `redirect_to` | Preferred post-login path (e.g. `/complaints/123`) |
| `return_to` | Fallback if `redirect_to` is absent |

The JWT payload may also include a `redirect_to` claim; query params take precedence on the frontend.

---

## Frontend Environment (outbound login)

To point “Continue with EMZI Nexus Brain” at the correct Nexus instance, set in `frontend/.env` before build:

```env
VITE_NEXUS_BRAIN_URL=https://emzinexus.com
```

Default if unset: `https://emzinexus.com` (see `frontend/src/lib/nexusBrain.js`).

Used on:

- Login page (`/login`)
- Register page (`/register`)
- Auth layout footer link

This does **not** configure inbound SSO verification; that is entirely backend `nexus_sso` config.

---

## JWT Token Requirements

Nexus must issue a standard three-part JWT (`header.payload.signature`).

### Signature

```
signature = base64url( HMAC-SHA256( "<header>.<payload>", secret ) )
```

Verified in `backend/app/Http/Controllers/Api/V1/SsoController.php`.

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
| `name` | Display name; falls back to email |
| `redirect_to` | Post-login redirect (sanitized server-side) |

---

## User Provisioning

On successful verification (`POST /api/v1/sso/nexus/verify`):

1. Lookup by `nexus_sso_id` (`sub` claim).
2. If not found, lookup by `email`.
3. If found: update `nexus_sso_id`, name, and email.
4. If not found: create user with:
   - Random password (not used for SSO login)
   - `status`: active
   - `approval_status`: approved (skips manual admin approval)
   - Role: `default_role_id` / `default_role` from config, else system default

Existing users who were disabled or rejected will fail with `403 User account is not active.`

---

## Backend Environment

Ensure these are set for correct redirects and CORS in production:

```env
APP_URL=https://careapi.example.com
FRONTEND_URL=https://care.example.com
```

`FRONTEND_URL` is used when sanitizing absolute `redirect_to` URLs in JWT claims.

---

## API Reference

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /sso/nexus?token=…` | Public | Frontend SSO handler; calls verify API |
| `POST /api/v1/sso/nexus/verify` | Public | Validates JWT, returns Sanctum token + user |
| `GET/PATCH /api/v1/system-configs` | Admin | Manage `nexus_sso` config |

Verify endpoint is rate-limited to **10 requests/minute**.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `SSO is not configured` | SSO disabled or empty secret | Enable SSO and set API key (≥ 32 chars) in Settings |
| `Invalid token signature` | Secret mismatch between Nexus and Care | Align API keys on both sides |
| `Invalid token issuer` | `iss` claim ≠ Expected Issuer URL | Match issuer URL or clear issuer field to disable check |
| `Token has expired` | JWT `exp` in the past | Nexus must issue fresh tokens |
| `Token missing sub claim` | No Nexus user ID in JWT | Nexus must include `sub` |
| `User account is not active` | User disabled/rejected in Care | Re-enable user in **Users** |
| Blank page at `/sso/nexus` | SPA not configured for client routing | Ensure Nginx `try_files … /index.html` |
| API errors from SSO page | Wrong `VITE_API_URL` or CORS | Set `VITE_API_URL` and backend `FRONTEND_URL` / CORS for production |

---

## Related Code

| Area | Location |
|------|----------|
| SSO verification | `backend/app/Http/Controllers/Api/V1/SsoController.php` |
| SSO landing page | `frontend/src/pages/SsoNexus.jsx` |
| Admin settings UI | `frontend/src/pages/Settings.jsx` |
| Redirect sanitization | `backend/app/Support/SsoRedirect.php`, `frontend/src/lib/ssoRedirect.js` |
| Nexus Brain URL | `frontend/src/lib/nexusBrain.js` |
| User SSO ID column | `backend/database/migrations/2026_06_13_000001_add_nexus_sso_id_to_users.php` |
| Outgoing webhooks (includes `sso_id`) | `backend/app/Http/Controllers/Api/V1/WebhookController.php` |
