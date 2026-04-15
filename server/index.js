import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Generate one with:\n  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import { createEntityRouter } from './routes/entities.js';

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

// User management (admin)
app.use('/api/users',        usersRouter);

// Settings (admin)
app.use('/api/settings',     settingsRouter);

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

app.listen(PORT, () => {
  console.log(`BookHub API running on http://localhost:${PORT}`);
});
