import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/base44Client';
import { getToken } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Shield, Database, Server, CheckCircle2, AlertCircle, Mail, Send, Bell, X, MessageCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Tag-based email input. value = comma-separated string, onChange = same format */
function TagEmailInput({ value, onChange, placeholder }) {
  const tags = value ? value.split(',').map(e => e.trim()).filter(Boolean) : [];
  const [input, setInput] = useState('');

  const addTag = () => {
    const email = input.trim();
    if (!email || tags.includes(email)) { setInput(''); return; }
    onChange([...tags, email].join(','));
    setInput('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag).join(','));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
  };

  return (
    <div className="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-1 focus-within:ring-ring">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded px-2 py-0.5 text-xs font-medium">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[140px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={addTag}
        placeholder={tags.length ? '' : placeholder}
      />
    </div>
  );
}

const DEFAULT_NOTIFY = { enabled: true, recipients: 'booker', custom_email: '' };

function parseNotify(raw) {
  try { return { ...DEFAULT_NOTIFY, ...(JSON.parse(raw || 'null') || {}) }; } catch { return { ...DEFAULT_NOTIFY }; }
}

/** Single trigger row — enable toggle + recipient select + optional custom field */
function NotifyTrigger({ label, value, onChange, customLabel, customField, customPlaceholder }) {
  const cField = customField || 'custom_email';
  const cfg = parseNotify(value);
  const update = (patch) => onChange(JSON.stringify({ ...cfg, ...patch }));

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Switch checked={!!cfg.enabled} onCheckedChange={v => update({ enabled: v })} />
      </div>
      {cfg.enabled && (
        <div className="space-y-2 pl-1">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notify</Label>
            <Select value={cfg.recipients} onValueChange={v => update({ recipients: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="booker">Booker only</SelectItem>
                <SelectItem value="admin">Admin only</SelectItem>
                <SelectItem value="both">Both (booker + admin)</SelectItem>
                <SelectItem value="custom">{customLabel || 'Custom email'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cfg.recipients === 'custom' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{customLabel || 'Custom email(s)'} — press Enter or Space to add</Label>
              <TagEmailInput
                value={cfg[cField] || ''}
                onChange={v => update({ [cField]: v })}
                placeholder={customPlaceholder || 'ops@company.com'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmailSettings() {
  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  const [cfg, setCfg] = useState({
    email_enabled: 'false',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_password: '',
    smtp_password_set: false,
    email_from: '',
    admin_email: '',
    notify_submitted: JSON.stringify(DEFAULT_NOTIFY),
    notify_rejected:  JSON.stringify({ ...DEFAULT_NOTIFY, recipients: 'booker' }),
    notify_cancelled: JSON.stringify({ ...DEFAULT_NOTIFY, recipients: 'both' }),
  });
  const [testTo, setTestTo] = useState('');
  const [status, setStatus] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => { setCfg(c => ({ ...c, ...data })); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setStatus({ ok: true, msg: 'Settings saved.' });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) return;
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch(`${API_BASE}/settings/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      setTestStatus({ ok: data.ok, msg: data.message });
    } catch (e) {
      setTestStatus({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">Email / SMTP</CardTitle>
            <p className="text-sm text-muted-foreground">Notifications for booking events</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={cfg.email_enabled === 'true'}
            onCheckedChange={v => setCfg(c => ({ ...c, email_enabled: v ? 'true' : 'false' }))}
          />
          <Label>Enable email notifications</Label>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>SMTP Host</Label>
            <Input value={cfg.smtp_host} onChange={e => setCfg(c => ({ ...c, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Port</Label>
            <Input value={cfg.smtp_port} onChange={e => setCfg(c => ({ ...c, smtp_port: e.target.value }))} placeholder="587" />
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={cfg.smtp_user} onChange={e => setCfg(c => ({ ...c, smtp_user: e.target.value }))} placeholder="you@gmail.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Password / App Password</Label>
            <div className="relative">
              <Input
                type="password"
                value={cfg.smtp_password}
                onChange={e => setCfg(c => ({ ...c, smtp_password: e.target.value, smtp_password_set: false }))}
                placeholder={cfg.smtp_password_set ? '••••••••  (saved — enter new to change)' : 'Enter password'}
              />
              {cfg.smtp_password_set && !cfg.smtp_password && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>From Address</Label>
            <Input value={cfg.email_from} onChange={e => setCfg(c => ({ ...c, email_from: e.target.value }))} placeholder="BookHub <noreply@yourdomain.com>" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch
              checked={cfg.smtp_secure === 'true'}
              onCheckedChange={v => setCfg(c => ({ ...c, smtp_secure: v ? 'true' : 'false' }))}
            />
            <Label>Use TLS (port 465)</Label>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <Label className="font-medium">Notification Triggers</Label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Admin email(s) — press Enter or Space to add (used when recipient is "Admin" or "Both")</Label>
            <TagEmailInput
              value={cfg.admin_email}
              onChange={v => setCfg(c => ({ ...c, admin_email: v }))}
              placeholder="admin@company.com"
            />
          </div>
          <NotifyTrigger
            label="Booking Submitted"
            value={cfg.notify_submitted}
            onChange={v => setCfg(c => ({ ...c, notify_submitted: v }))}
          />
          <NotifyTrigger
            label="Booking Rejected"
            value={cfg.notify_rejected}
            onChange={v => setCfg(c => ({ ...c, notify_rejected: v }))}
          />
          <NotifyTrigger
            label="Booking Cancelled"
            value={cfg.notify_cancelled}
            onChange={v => setCfg(c => ({ ...c, notify_cancelled: v }))}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
        </div>

        {status && (
          <Alert variant={status.ok ? 'default' : 'destructive'} className="py-2">
            {status.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{status.msg}</AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>Send Test Email</Label>
          <div className="flex gap-2">
            <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="recipient@example.com" type="email" />
            <Button variant="outline" onClick={sendTest} disabled={testing || !testTo}>
              <Send className="w-4 h-4 mr-1" />{testing ? 'Sending…' : 'Send'}
            </Button>
          </div>
          {testStatus && (
            <Alert variant={testStatus.ok ? 'default' : 'destructive'} className="py-2">
              {testStatus.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{testStatus.msg}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WhatsAppSettings() {
  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  const DEFAULT_WA_NOTIFY = { enabled: true, recipients: 'booker', custom_phone: '' };
  const parseWANotify = (raw) => {
    try { return { ...DEFAULT_WA_NOTIFY, ...(JSON.parse(raw || 'null') || {}) }; } catch { return { ...DEFAULT_WA_NOTIFY }; }
  };
  const [cfg, setCfg] = useState({
    wa_enabled: 'false',
    wa_phone_id: '',
    wa_token: '',
    wa_token_set: false,
    wa_api_version: 'v19.0',
    wa_admin_phone: '',
    notify_wa_submitted: JSON.stringify(DEFAULT_WA_NOTIFY),
    notify_wa_rejected:  JSON.stringify({ ...DEFAULT_WA_NOTIFY, recipients: 'booker' }),
    notify_wa_cancelled: JSON.stringify({ ...DEFAULT_WA_NOTIFY, recipients: 'both' }),
  });
  const [testTo, setTestTo] = useState('');
  const [status, setStatus] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => { setCfg(c => ({ ...c, ...data })); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setStatus({ ok: true, msg: 'Settings saved.' });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) return;
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch(`${API_BASE}/settings/test-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      setTestStatus({ ok: data.ok, msg: data.message });
    } catch (e) {
      setTestStatus({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-base">WhatsApp Notifications</CardTitle>
            <p className="text-sm text-muted-foreground">Meta Cloud API — notify on booking events</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={cfg.wa_enabled === 'true'}
            onCheckedChange={v => setCfg(c => ({ ...c, wa_enabled: v ? 'true' : 'false' }))}
          />
          <Label>Enable WhatsApp notifications</Label>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Phone Number ID</Label>
            <Input value={cfg.wa_phone_id} onChange={e => setCfg(c => ({ ...c, wa_phone_id: e.target.value }))} placeholder="Your Meta Phone Number ID" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Access Token</Label>
            <div className="relative">
              <Input
                type="password"
                value={cfg.wa_token}
                onChange={e => setCfg(c => ({ ...c, wa_token: e.target.value, wa_token_set: false }))}
                placeholder={cfg.wa_token_set ? '••••••••  (saved — enter new to change)' : 'Permanent access token'}
              />
              {cfg.wa_token_set && !cfg.wa_token && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>API Version</Label>
            <Input value={cfg.wa_api_version} onChange={e => setCfg(c => ({ ...c, wa_api_version: e.target.value }))} placeholder="v19.0" />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <Label className="font-medium">Notification Triggers</Label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Admin phone(s) — press Enter or Space to add (used when recipient is "Admin" or "Both")
            </Label>
            <TagEmailInput
              value={cfg.wa_admin_phone}
              onChange={v => setCfg(c => ({ ...c, wa_admin_phone: v }))}
              placeholder="60123456789"
            />
          </div>
          <NotifyTrigger
            label="Booking Submitted"
            value={cfg.notify_wa_submitted}
            onChange={v => setCfg(c => ({ ...c, notify_wa_submitted: v }))}
            customField="custom_phone"
            customLabel="Custom phone"
            customPlaceholder="60123456789"
          />
          <NotifyTrigger
            label="Booking Rejected"
            value={cfg.notify_wa_rejected}
            onChange={v => setCfg(c => ({ ...c, notify_wa_rejected: v }))}
            customField="custom_phone"
            customLabel="Custom phone"
            customPlaceholder="60123456789"
          />
          <NotifyTrigger
            label="Booking Cancelled"
            value={cfg.notify_wa_cancelled}
            onChange={v => setCfg(c => ({ ...c, notify_wa_cancelled: v }))}
            customField="custom_phone"
            customLabel="Custom phone"
            customPlaceholder="60123456789"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
        </div>

        {status && (
          <Alert variant={status.ok ? 'default' : 'destructive'} className="py-2">
            {status.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{status.msg}</AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>Send Test Message</Label>
          <div className="flex gap-2">
            <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="60123456789" />
            <Button variant="outline" onClick={sendTest} disabled={testing || !testTo}>
              <Send className="w-4 h-4 mr-1" />{testing ? 'Sending…' : 'Send'}
            </Button>
          </div>
          {testStatus && (
            <Alert variant={testStatus.ok ? 'default' : 'destructive'} className="py-2">
              {testStatus.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{testStatus.msg}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useOutletContext();
  const isAdmin = user?.role === 'admin';

  const { data: resources = [] } = useQuery({ queryKey: ['resources'], queryFn: () => db.entities.Resource.list(), enabled: isAdmin });
  const { data: bookings  = [] } = useQuery({ queryKey: ['bookings'],  queryFn: () => db.entities.Booking.list(),  enabled: isAdmin });
  const { data: allUsers  = [] } = useQuery({ queryKey: ['users'],     queryFn: () => db.entities.User.list(),     enabled: isAdmin });

  const stats = [
    { label: 'Users',     value: allUsers.length },
    { label: 'Resources', value: resources.length },
    { label: 'Bookings',  value: bookings.length },
    { label: 'Pending',   value: bookings.filter(b => b.status === 'pending').length },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">System configuration</p>
      </div>

      {isAdmin && (
        <>
          {/* Email / SMTP */}
          <EmailSettings />

          {/* WhatsApp */}
          <WhatsAppSettings />

          {/* Database stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Database</CardTitle>
                  <p className="text-sm text-muted-foreground">MySQL — live stats</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map(s => (
                  <div key={s.label} className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Auth info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Authentication</CardTitle>
                  <p className="text-sm text-muted-foreground">JWT — self-hosted</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge>Active</Badge>
                <span className="text-muted-foreground">Role-based access control (admin / user)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">Token expiry:</span> 7 days (configurable via <code className="text-xs bg-muted px-1 rounded">JWT_EXPIRES_IN</code> in .env)
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">Storage:</span> localStorage (<code className="text-xs bg-muted px-1 rounded">booking_auth_token</code>)
              </div>
            </CardContent>
          </Card>

          {/* Server info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Server</CardTitle>
                  <p className="text-sm text-muted-foreground">Node.js + Express — port 3001</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">API base:</span> /api (proxied by Vite in dev)</p>
              <p><span className="font-medium text-foreground">API routes:</span> /api/auth, /api/users, /api/resources, /api/bookings, /api/transactions, /api/rooms</p>
              <p><span className="font-medium text-foreground">Run command:</span> <code className="text-xs bg-muted px-1 rounded">npm run dev:full</code></p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
