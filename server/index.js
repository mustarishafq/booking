import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Generate one with:\n  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
import cors from 'cors';
import authRouter from './routes/auth.js';
import ssoRouter from './routes/sso.js';
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import rolesRouter from './routes/roles.js';
import notificationsRouter from './routes/notifications.js';
import uploadRouter from './routes/upload.js';
import auditRouter from './routes/audit.js';
import resourceCareRouter from './routes/resourceCare.js';
import { createEntityRouter } from './routes/entities.js';
import { processCareReminders } from './resourceCare.js';

const app  = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors({
  // In dev with no FRONTEND_URL set, allow all origins.
  // In production set FRONTEND_URL to your exact domain(s).
  origin: (origin, cb) => {
    const allowed = (process.env.FRONTEND_URL || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    if (!allowed.length || !origin || allowed.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// Auth
app.use('/api/auth',         authRouter);

// Nexus SSO
app.use('/api/sso',          ssoRouter);

// User management (admin)
app.use('/api/users',        usersRouter);

// Settings (admin)
app.use('/api/settings',     settingsRouter);

// Roles (admin)
app.use('/api/roles',        rolesRouter);

// In-app notifications
app.use('/api/notifications', notificationsRouter);

// Audit logs (admin)
app.use('/api/audit-logs', auditRouter);

// Resource care / upkeep
app.use('/api/resource-care', resourceCareRouter);

// File uploads
app.use('/api/upload', uploadRouter);
app.use('/api/uploads', express.static(join(__dirname, 'uploads')));

// Generic entity CRUD
app.use('/api/resources',    createEntityRouter('resources'));
app.use('/api/bookings',     createEntityRouter('bookings'));
app.use('/api/transactions', createEntityRouter('transactions'));
app.use('/api/rooms',        createEntityRouter('rooms'));

// Global error handler — returns JSON instead of Express's default HTML
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[${req.method} ${req.path}] ${err.message}`);
  res.status(status).json({ message: err.message || 'Internal server error' });
});

// Serve frontend in production
const distPath = join(__dirname, '../dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`EMZI Nexus Booking API running on http://localhost:${PORT}`);

  processCareReminders().catch(err => {
    console.error('[resource-care] Initial reminder check failed:', err.message);
  });
  setInterval(() => {
    processCareReminders().catch(err => {
      console.error('[resource-care] Reminder check failed:', err.message);
    });
  }, 60 * 60 * 1000);
});
