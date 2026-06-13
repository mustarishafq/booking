# EMZI Nexus Booking

A resource-booking web application built with **React + Vite** (frontend) and **Express + MySQL** (backend).

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend  | Node.js, Express 4                      |
| Database | MySQL 8.0                               |
| Auth     | JWT (jsonwebtoken) + bcrypt             |

---

## Prerequisites

- **Node.js** ≥ 18
- **MySQL** 8.0 (local install or cloud)
- `npm` ≥ 9

---

## Local Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd booking
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your local values:

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=booking

# JWT — generate a secure secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<paste_generated_secret_here>
JWT_EXPIRES_IN=7d

# Express server port
PORT=3001
FRONTEND_URL=http://localhost:5173

# Leave blank in development (Vite proxies /api → localhost:3001)
VITE_API_URL=
```

### 3. Create the database and tables

Connect to MySQL and run the schema:

```bash
mysql -u root -p < server/schema.sql
```

Or open `server/schema.sql` in your MySQL client (TablePlus, DBeaver, MySQL Workbench, etc.) and execute it.

### 4. Create the first admin user

```bash
# Start a temporary Node REPL and run:
node -e "
import('bcryptjs').then(async ({ default: bcrypt }) => {
  const { default: pool } = await import('./server/db.js');
  const hash = await bcrypt.hash('admin1234', 12);
  const { randomUUID } = await import('crypto');
  await pool.query(
    'INSERT INTO users (id, email, full_name, role, password_hash) VALUES (?, ?, ?, ?, ?)',
    [randomUUID(), 'admin@example.com', 'Admin', 'admin', hash]
  );
  console.log('Admin created');
  process.exit(0);
});
"
```

Or simply sign up via the app UI and then manually update the role in MySQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### 5. Run in development

Open **two terminals**:

```bash
# Terminal 1 — API server (with file watching)
npm run server:dev

# Terminal 2 — Vite dev server
npm run dev
```

The app is available at **http://localhost:5173**.  
Vite automatically proxies `/api/*` requests to `http://localhost:3001`.

---

## Production Deployment

### 1. Build the frontend

```bash
npm run build
```

Static files are output to `dist/`. Serve them with a CDN, Nginx, or any static host.

### 2. Set production environment variables

On your server / hosting platform set the same variables as `.env.example`, plus:

```env
# Point the frontend to the API server's public URL
VITE_API_URL=https://api.yourdomain.com

# Allow your production frontend origin
FRONTEND_URL=https://yourdomain.com
```

> **Re-run `npm run build` after changing `VITE_API_URL`** — it is baked in at build time.

### 3. Start the API server

```bash
npm run server
```

Use a process manager such as **PM2** to keep it running:

```bash
npm install -g pm2
pm2 start server/index.js --name nexus-booking-api
pm2 save
```

---

## Cloud MySQL Setup

### Option A — PlanetScale (serverless MySQL)

1. Create a free database at [planetscale.com](https://planetscale.com).
2. Copy the connection string and set the env vars:
   ```env
   DB_HOST=aws.connect.psdb.cloud
   DB_PORT=3306
   DB_USER=<username>
   DB_PASSWORD=<password>
   DB_NAME=<database>
   ```
3. PlanetScale requires SSL. Add this to `server/db.js` inside `createPool`:
   ```js
   ssl: { rejectUnauthorized: true }
   ```
4. Apply the schema using the PlanetScale web console or CLI (`pscale shell <db> <branch> < server/schema.sql`).

### Option B — Railway

1. Create a project at [railway.app](https://railway.app) and add a **MySQL** service.
2. Click the MySQL service → **Connect** → copy the individual variables (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`).
3. Map them to the env vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
4. Deploy the Express server as a second Railway service pointing to this repo.

### Option C — AWS RDS / Google Cloud SQL / Azure Database for MySQL

1. Create a MySQL 8.0 instance and allow connections from your app's IP (or VPC).
2. Set the standard env vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
3. For SSL-required clouds, add `ssl: { rejectUnauthorized: true }` to `server/db.js`.

---

## Project Structure

```
├── server/              # Express API
│   ├── index.js         # Entry point
│   ├── db.js            # MySQL connection pool
│   ├── schema.sql       # Database schema
│   ├── middleware/
│   │   └── auth.js      # JWT middleware
│   └── routes/
│       ├── auth.js      # Login / register / me
│       ├── entities.js  # Generic CRUD factory
│       └── users.js     # Admin user management
├── src/                 # React frontend
│   ├── api/
│   │   └── base44Client.js  # HTTP client (fetch wrapper)
│   ├── lib/
│   │   └── AuthContext.jsx  # JWT auth state
│   ├── pages/           # Route-level components
│   └── components/      # Shared UI components
├── .env.example         # Environment variable template
└── vite.config.js       # Vite config with /api proxy
```

---

## Environment Variables Reference

| Variable         | Where used | Description                                      |
|------------------|-----------|--------------------------------------------------|
| `DB_HOST`        | server    | MySQL host                                       |
| `DB_PORT`        | server    | MySQL port (default `3306`)                      |
| `DB_USER`        | server    | MySQL username                                   |
| `DB_PASSWORD`    | server    | MySQL password                                   |
| `DB_NAME`        | server    | MySQL database name                              |
| `JWT_SECRET`     | server    | Secret for signing JWTs — keep this private      |
| `JWT_EXPIRES_IN` | server    | Token lifetime (default `7d`)                    |
| `PORT`           | server    | Express listen port (default `3001`)             |
| `FRONTEND_URL`   | server    | Allowed CORS origin(s), comma-separated          |
| `VITE_API_URL`   | frontend  | API base URL (empty = use Vite proxy in dev)     |

Run the app: `npm run dev`

**Publish your changes**

Open [db.com](http://db.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.db.com/Integrations/Using-GitHub](https://docs.db.com/Integrations/Using-GitHub)

Support: [https://app.db.com/support](https://app.db.com/support)
