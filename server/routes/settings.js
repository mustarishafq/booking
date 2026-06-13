import crypto from 'crypto';
import { Router } from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { sendTestMail } from '../emailer.js';
import { sendTestWA } from '../whatsapp.js';
import { sendTestWebhook, parseWebhooksForApi, serializeWebhooks, generateWebhookSecret } from '../webhooks.js';

const router = Router();

const EMAIL_KEYS = [
  'email_enabled', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'email_from',
  'admin_email',
  'notify_submitted', 'notify_rejected', 'notify_cancelled',
];

const WA_KEYS = [
  'wa_enabled', 'wa_phone_id', 'wa_token', 'wa_api_version', 'wa_admin_phone',
  'notify_wa_submitted', 'notify_wa_rejected', 'notify_wa_cancelled',
];

const WEBHOOK_KEYS = ['webhooks'];

const NEXUS_SSO_KEYS = ['nexus_sso'];

const ALLOWED_KEYS = [...EMAIL_KEYS, ...WA_KEYS, ...WEBHOOK_KEYS, ...NEXUS_SSO_KEYS];

const DEFAULT_NEXUS_SSO = {
  enabled: false,
  secret: '',
  issuer: '',
  default_role: 'user',
  default_role_id: null,
};

function parseNexusSso(raw) {
  if (!raw) return { ...DEFAULT_NEXUS_SSO };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...DEFAULT_NEXUS_SSO, ...parsed };
  } catch {
    return { ...DEFAULT_NEXUS_SSO };
  }
}

function nexusSsoForApi(raw) {
  const cfg = parseNexusSso(raw);
  return {
    enabled: !!cfg.enabled,
    issuer: cfg.issuer || '',
    secret: '',
    secret_set: !!(cfg.secret && cfg.secret.length >= 32),
    default_role: cfg.default_role || 'user',
    default_role_id: cfg.default_role_id || null,
  };
}

// GET /api/settings — load all settings (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
    const result = {};
    for (const row of rows) result[row.key] = row.value;
    // Never expose secrets — return boolean presence flags instead
    result.smtp_password_set = !!(result.smtp_password);
    result.smtp_password = '';
    result.wa_token_set = !!(result.wa_token);
    result.wa_token = '';
    result.webhooks = parseWebhooksForApi(result.webhooks, result);
    result.nexus_sso = nexusSsoForApi(result.nexus_sso);
    delete result.nexus_sso_raw;
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/settings — upsert settings (admin)
router.patch('/', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const allowed = Object.keys(updates).filter(k => ALLOWED_KEYS.includes(k));
    if (!allowed.length) return res.json({ ok: true });

    for (const key of allowed) {
      // Never overwrite secrets with an empty string — blank means "keep existing"
      if ((key === 'smtp_password' || key === 'wa_token') && !updates[key]) continue;

      let value = updates[key];
      if (key === 'nexus_sso') {
        const incoming = typeof value === 'string' ? JSON.parse(value) : value;
        const [existingRows] = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', ['nexus_sso']);
        const existing = parseNexusSso(existingRows[0]?.value);

        const merged = {
          ...existing,
          ...incoming,
          secret: incoming.secret || existing.secret,
        };

        if (merged.enabled && (!merged.secret || merged.secret.length < 32)) {
          return res.status(400).json({ message: 'API key must be at least 32 characters when SSO is enabled.' });
        }

        value = JSON.stringify({
          enabled: !!merged.enabled,
          secret: merged.secret || '',
          issuer: merged.issuer || '',
          default_role: merged.default_role || 'user',
          default_role_id: merged.default_role_id || null,
        });
      }
      if (key === 'webhooks') {
        const incoming = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(incoming)) {
          return res.status(400).json({ message: 'webhooks must be an array' });
        }
        const existing = parseWebhooksForApi(
          (await pool.query('SELECT `value` FROM settings WHERE `key` = ?', ['webhooks']))[0][0]?.value,
        );
        const existingById = Object.fromEntries(existing.map(w => [w.id, w]));

        value = serializeWebhooks(incoming.map(wh => {
          const prev = existingById[wh.id];
          return {
            ...wh,
            id: wh.id || crypto.randomUUID(),
            secret: wh.secret || prev?.secret || generateWebhookSecret(),
          };
        }));
      }

      await pool.query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [key, String(value)],
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/settings/test-email — send a test email (admin)
router.post('/test-email', requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'Recipient email required' });
    const result = await sendTestMail(to);
    if (result.ok) {
      res.json({ ok: true, message: `Test email sent to ${to}` });
    } else {
      res.status(500).json({ ok: false, message: result.error });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/settings/test-whatsapp — send a test WA message (admin)
router.post('/test-whatsapp', requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'Phone number required' });
    const result = await sendTestWA(to);
    if (result.ok) {
      res.json({ ok: true, message: `Test message sent to ${to}` });
    } else {
      res.status(500).json({ ok: false, message: result.error });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/settings/test-webhook — send a test webhook payload (admin)
router.post('/test-webhook', requireAdmin, async (req, res) => {
  try {
    const { webhookId, webhook } = req.body;
    if (!webhookId && !webhook?.url) {
      return res.status(400).json({ message: 'webhookId or webhook payload required' });
    }
    const result = await sendTestWebhook(webhookId, webhook);
    if (result.ok) {
      res.json({ ok: true, message: 'Test webhook delivered successfully.' });
    } else {
      res.status(500).json({ ok: false, message: result.error });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
