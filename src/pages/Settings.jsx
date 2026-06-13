import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getToken } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield, CheckCircle2, AlertCircle, Mail, Send, Bell, X,
  MessageCircle, Settings as SettingsIcon, Webhook, Plus, Trash2,
  Eye, EyeOff, Copy, RefreshCw, KeyRound,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const iconColorMap = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
};

function SettingsSectionCard({ icon: Icon, iconColor = 'primary', title, description, children, index = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={className}
    >
      <Card className="rounded-2xl border border-border">
        <CardHeader className="p-4 pb-4 sm:p-6">
          <div className="flex items-start sm:items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconColorMap[iconColor])}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-snug">{title}</CardTitle>
              {description && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function SettingsSectionSkeleton() {
  return (
    <Card className="rounded-2xl border border-border">
      <CardHeader className="p-4 pb-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsToggleRow({ checked, onCheckedChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
      <div className="space-y-0.5 min-w-0 flex-1">
        <Label className="text-sm font-medium leading-snug">{label}</Label>
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}

function SettingsSubsection({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, disabled, saving, label = 'Save Settings' }) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full md:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30"
    >
      {saving ? 'Saving…' : label}
    </Button>
  );
}

function StatusAlert({ status, className }) {
  if (!status) return null;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm',
        status.ok
          ? 'border-success/30 bg-success/5 text-success'
          : 'border-destructive/30 bg-destructive/5 text-destructive',
        className,
      )}
    >
      {status.ok
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      <span className="leading-snug">{status.msg}</span>
    </div>
  );
}

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
    <div className="flex flex-wrap gap-1.5 min-h-10 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary transition-colors">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors" aria-label={`Remove ${tag}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[140px] bg-transparent outline-none placeholder:text-muted-foreground/50 text-sm"
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
    <div className="rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium leading-snug min-w-0">{label}</span>
        <Switch checked={!!cfg.enabled} onCheckedChange={v => update({ enabled: v })} className="shrink-0" />
      </div>
      {cfg.enabled && (
        <div className="space-y-3 pt-1 border-t border-border/60">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notify</Label>
            <Select value={cfg.recipients} onValueChange={v => update({ recipients: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="booker">Booker only</SelectItem>
                <SelectItem value="admin">Admin only</SelectItem>
                <SelectItem value="both">Both (booker + admin)</SelectItem>
                <SelectItem value="custom">{customLabel || 'Custom email'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cfg.recipients === 'custom' && (
            <div className="space-y-1.5">
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

  if (loading) return <SettingsSectionSkeleton />;

  return (
    <SettingsSectionCard icon={Mail} iconColor="primary" title="Email / SMTP" description="Notifications for booking events">
      <SettingsToggleRow
        checked={cfg.email_enabled === 'true'}
        onCheckedChange={v => setCfg(c => ({ ...c, email_enabled: v ? 'true' : 'false' }))}
        label="Enable email notifications"
        description="Send automated emails when booking events occur"
      />

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">SMTP Host</Label>
          <Input value={cfg.smtp_host} onChange={e => setCfg(c => ({ ...c, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Port</Label>
          <Input value={cfg.smtp_port} onChange={e => setCfg(c => ({ ...c, smtp_port: e.target.value }))} placeholder="587" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Username</Label>
          <Input value={cfg.smtp_user} onChange={e => setCfg(c => ({ ...c, smtp_user: e.target.value }))} placeholder="you@gmail.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Password / App Password</Label>
          <div className="relative">
            <Input
              type="password"
              value={cfg.smtp_password}
              onChange={e => setCfg(c => ({ ...c, smtp_password: e.target.value, smtp_password_set: false }))}
              placeholder={cfg.smtp_password_set ? '••••••••  (saved — enter new to change)' : 'Enter password'}
              className={cn(cfg.smtp_password_set && !cfg.smtp_password && 'pr-20 sm:pr-24')}
            />
            {cfg.smtp_password_set && !cfg.smtp_password && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-success font-medium flex items-center gap-1 pointer-events-none">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Saved
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
          <Label className="text-sm font-medium">From Address</Label>
          <Input value={cfg.email_from} onChange={e => setCfg(c => ({ ...c, email_from: e.target.value }))} placeholder="EMZI Nexus Booking <noreply@yourdomain.com>" />
        </div>
        <div className="flex items-center gap-3 md:pt-0 lg:pt-7">
          <Switch
            checked={cfg.smtp_secure === 'true'}
            onCheckedChange={v => setCfg(c => ({ ...c, smtp_secure: v ? 'true' : 'false' }))}
          />
          <Label className="text-sm font-medium">Use TLS (port 465)</Label>
        </div>
      </div>

      <Separator />

      <SettingsSubsection title="Notification Triggers" icon={Bell}>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Admin email(s) — press Enter or Space to add (used when recipient is "Admin" or "Both")</Label>
          <TagEmailInput
            value={cfg.admin_email}
            onChange={v => setCfg(c => ({ ...c, admin_email: v }))}
            placeholder="admin@company.com"
          />
        </div>
        <div className="space-y-2">
          <NotifyTrigger label="Booking Submitted" value={cfg.notify_submitted} onChange={v => setCfg(c => ({ ...c, notify_submitted: v }))} />
          <NotifyTrigger label="Booking Rejected" value={cfg.notify_rejected} onChange={v => setCfg(c => ({ ...c, notify_rejected: v }))} />
          <NotifyTrigger label="Booking Cancelled" value={cfg.notify_cancelled} onChange={v => setCfg(c => ({ ...c, notify_cancelled: v }))} />
        </div>
      </SettingsSubsection>

      <div className="space-y-3">
        <SaveButton onClick={save} saving={saving} />
        <StatusAlert status={status} />
      </div>

      <Separator />

      <SettingsSubsection title="Send Test Email" icon={Send}>
        <div className="flex flex-col md:flex-row gap-2">
          <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="recipient@example.com" type="email" className="flex-1 min-w-0" />
          <Button variant="outline" onClick={sendTest} disabled={testing || !testTo} className="w-full md:w-auto shrink-0">
            <Send className="w-4 h-4 mr-1.5" />{testing ? 'Sending…' : 'Send Test'}
          </Button>
        </div>
        <StatusAlert status={testStatus} />
      </SettingsSubsection>
    </SettingsSectionCard>
  );
}

function WhatsAppSettings() {
  const DEFAULT_WA_NOTIFY = { enabled: true, recipients: 'booker', custom_phone: '' };
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

  if (loading) return <SettingsSectionSkeleton />;

  return (
    <SettingsSectionCard icon={MessageCircle} iconColor="success" title="WhatsApp Notifications" description="Meta Cloud API — notify on booking events">
      <SettingsToggleRow
        checked={cfg.wa_enabled === 'true'}
        onCheckedChange={v => setCfg(c => ({ ...c, wa_enabled: v ? 'true' : 'false' }))}
        label="Enable WhatsApp notifications"
        description="Send messages via the Meta Cloud API when events occur"
      />

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">Phone Number ID</Label>
          <Input value={cfg.wa_phone_id} onChange={e => setCfg(c => ({ ...c, wa_phone_id: e.target.value }))} placeholder="Your Meta Phone Number ID" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">Access Token</Label>
          <div className="relative">
            <Input
              type="password"
              value={cfg.wa_token}
              onChange={e => setCfg(c => ({ ...c, wa_token: e.target.value, wa_token_set: false }))}
              placeholder={cfg.wa_token_set ? '••••••••  (saved — enter new to change)' : 'Permanent access token'}
              className={cn(cfg.wa_token_set && !cfg.wa_token && 'pr-20 sm:pr-24')}
            />
            {cfg.wa_token_set && !cfg.wa_token && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-success font-medium flex items-center gap-1 pointer-events-none">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Saved
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">API Version</Label>
          <Input value={cfg.wa_api_version} onChange={e => setCfg(c => ({ ...c, wa_api_version: e.target.value }))} placeholder="v19.0" />
        </div>
      </div>

      <Separator />

      <SettingsSubsection title="Notification Triggers" icon={Bell}>
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
        <div className="space-y-2">
          <NotifyTrigger label="Booking Submitted" value={cfg.notify_wa_submitted} onChange={v => setCfg(c => ({ ...c, notify_wa_submitted: v }))} customField="custom_phone" customLabel="Custom phone" customPlaceholder="60123456789" />
          <NotifyTrigger label="Booking Rejected" value={cfg.notify_wa_rejected} onChange={v => setCfg(c => ({ ...c, notify_wa_rejected: v }))} customField="custom_phone" customLabel="Custom phone" customPlaceholder="60123456789" />
          <NotifyTrigger label="Booking Cancelled" value={cfg.notify_wa_cancelled} onChange={v => setCfg(c => ({ ...c, notify_wa_cancelled: v }))} customField="custom_phone" customLabel="Custom phone" customPlaceholder="60123456789" />
        </div>
      </SettingsSubsection>

      <div className="space-y-3">
        <SaveButton onClick={save} saving={saving} />
        <StatusAlert status={status} />
      </div>

      <Separator />

      <SettingsSubsection title="Send Test Message" icon={Send}>
        <div className="flex flex-col md:flex-row gap-2">
          <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="60123456789" className="flex-1 min-w-0" />
          <Button variant="outline" onClick={sendTest} disabled={testing || !testTo} className="w-full md:w-auto shrink-0">
            <Send className="w-4 h-4 mr-1.5" />{testing ? 'Sending…' : 'Send Test'}
          </Button>
        </div>
        <StatusAlert status={testStatus} />
      </SettingsSubsection>
    </SettingsSectionCard>
  );
}

const WEBHOOK_EVENTS = [
  { key: 'submitted', label: 'Booking Submitted' },
  { key: 'confirmed', label: 'Booking Confirmed' },
  { key: 'rejected', label: 'Booking Rejected' },
  { key: 'cancelled', label: 'Booking Cancelled' },
];

function generateWebhookSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `whsec_${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

function createWebhook(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: '',
    url: '',
    secret: generateWebhookSecret(),
    enabled: true,
    events: { submitted: true, confirmed: true, rejected: true, cancelled: true },
    ...overrides,
  };
}

function WebhookSecretField({ secret, onRegenerate }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">X-Webhook-Secret</Label>
      <p className="text-xs text-muted-foreground">Auto-generated and sent on every request in the <code className="bg-muted px-1 py-0.5 rounded text-[11px]">X-Webhook-Secret</code> header.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Input
            readOnly
            type={visible ? 'text' : 'password'}
            value={secret}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex gap-2 shrink-0 self-end sm:self-auto">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide secret' : 'Show secret'}>
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={copySecret} aria-label="Copy secret">
            {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={onRegenerate} aria-label="Regenerate secret">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function WebhookCard({ webhook, index, onChange, onRemove, onTest, testing }) {
  const update = (patch) => onChange({ ...webhook, ...patch });
  const updateEvent = (key, enabled) => onChange({ ...webhook, events: { ...webhook.events, [key]: enabled } });

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Webhook {index + 1}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={!!webhook.enabled} onCheckedChange={v => update({ enabled: v })} />
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Remove webhook">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Name</Label>
          <Input value={webhook.name} onChange={e => update({ name: e.target.value })} placeholder="e.g. Slack, Zapier" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">URL</Label>
          <Input value={webhook.url} onChange={e => update({ url: e.target.value })} placeholder="https://example.com/webhooks/nexus-booking" />
        </div>
      </div>

      <WebhookSecretField
        secret={webhook.secret}
        onRegenerate={() => update({ secret: generateWebhookSecret() })}
      />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Events</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {WEBHOOK_EVENTS.map(ev => (
            <div key={ev.key} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 min-h-[44px]">
              <span className="text-sm leading-snug min-w-0">{ev.label}</span>
              <Switch checked={!!webhook.events?.[ev.key]} onCheckedChange={v => updateEvent(ev.key, v)} className="shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onTest(webhook)}
        disabled={testing || !webhook.url}
        className="w-full md:w-auto"
      >
        <Send className="w-4 h-4 mr-1.5" />
        {testing ? 'Sending…' : 'Send Test'}
      </Button>
    </div>
  );
}

function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function NexusSsoSettings() {
  const [cfg, setCfg] = useState({
    enabled: false,
    issuer: '',
    secret: '',
    secret_set: false,
    default_role: 'user',
    default_role_id: null,
  });
  const [roles, setRoles] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const ssoEndpoint = `${window.location.origin}/sso/nexus`;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
      fetch(`${API_BASE}/roles`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
    ])
      .then(([settings, roleList]) => {
        const sso = settings.nexus_sso || {};
        setCfg({
          enabled: !!sso.enabled,
          issuer: sso.issuer || '',
          secret: '',
          secret_set: !!sso.secret_set,
          default_role: sso.default_role || 'user',
          default_role_id: sso.default_role_id || null,
        });
        setRoles(Array.isArray(roleList) ? roleList : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        nexus_sso: {
          enabled: cfg.enabled,
          issuer: cfg.issuer,
          default_role: cfg.default_role,
          default_role_id: cfg.default_role_id,
        },
      };
      if (cfg.secret) payload.nexus_sso.secret = cfg.secret;

      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      if (cfg.secret) setCfg(c => ({ ...c, secret: '', secret_set: true }));
      setStatus({ ok: true, msg: 'Nexus SSO settings saved.' });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(ssoEndpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  if (loading) return <SettingsSectionSkeleton />;

  return (
    <SettingsSectionCard
      icon={KeyRound}
      iconColor="warning"
      title="Nexus SSO Integration"
      description="Accept inbound sign-in from EMZI Nexus Brain via signed JWT"
    >
      <SettingsToggleRow
        checked={cfg.enabled}
        onCheckedChange={v => setCfg(c => ({ ...c, enabled: v }))}
        label="Enable Nexus SSO"
        description="When disabled, token verification returns “SSO is not configured.”"
      />

      <Separator />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">SSO Endpoint</Label>
          <p className="text-xs text-muted-foreground">Register this URL in EMZI Nexus Brain as the connected system SSO endpoint.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={ssoEndpoint} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={copyEndpoint} className="shrink-0 gap-1.5">
              {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">API Key (Shared Secret)</Label>
          <p className="text-xs text-muted-foreground">Min. 32 characters. Must match the API key configured in Nexus Brain for this system.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={cfg.secret}
                onChange={e => setCfg(c => ({ ...c, secret: e.target.value, secret_set: false }))}
                placeholder={cfg.secret_set ? '••••••••  (saved — enter new to change)' : 'Paste or generate a shared secret'}
                className="font-mono text-xs pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSecret(v => !v)}
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button type="button" variant="outline" onClick={() => setCfg(c => ({ ...c, secret: generateApiKey(), secret_set: false }))} className="shrink-0 gap-1.5">
              <RefreshCw className="w-4 h-4" />
              Generate
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Expected Issuer URL</Label>
          <p className="text-xs text-muted-foreground">JWT <code className="bg-muted px-1 py-0.5 rounded text-[11px]">iss</code> claim must match exactly. Leave empty to skip issuer validation.</p>
          <Input
            value={cfg.issuer}
            onChange={e => setCfg(c => ({ ...c, issuer: e.target.value }))}
            placeholder="https://emzinexus.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Default role for new SSO users</Label>
          <Select
            value={cfg.default_role_id || cfg.default_role || 'user'}
            onValueChange={v => {
              const role = roles.find(r => r.id === v);
              if (role) {
                setCfg(c => ({ ...c, default_role_id: role.id, default_role: 'user' }));
              } else {
                setCfg(c => ({ ...c, default_role_id: null, default_role: v }));
              }
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User (built-in)</SelectItem>
              <SelectItem value="admin">Admin (built-in)</SelectItem>
              {roles.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <SaveButton onClick={save} saving={saving} label="Save SSO Settings" />
        <StatusAlert status={status} />
      </div>
    </SettingsSectionCard>
  );
}

function WebhookSettings() {
  const [webhooks, setWebhooks] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data.webhooks) ? data.webhooks : [];
        setWebhooks(list.length ? list : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ webhooks }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setStatus({ ok: true, msg: 'Webhooks saved.' });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (webhook) => {
    setTestingId(webhook.id);
    try {
      const res = await fetch(`${API_BASE}/settings/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ webhookId: webhook.id, webhook }),
      });
      const data = await res.json();
      const ok = res.ok && data.ok !== false;
      const message = data.message || data.msg || (ok ? 'Test webhook delivered successfully.' : 'Request failed');
      if (ok) toast.success(message);
      else toast.error(message);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTestingId(null);
    }
  };

  const updateWebhook = (index, updated) => {
    setWebhooks(list => list.map((w, i) => (i === index ? updated : w)));
  };

  const removeWebhook = (index) => {
    setWebhooks(list => list.filter((_, i) => i !== index));
  };

  if (loading) return <SettingsSectionSkeleton />;

  return (
    <SettingsSectionCard icon={Webhook} iconColor="info" title="Webhooks" description="POST booking events to one or more external URLs">
      <p className="text-sm text-muted-foreground -mt-2">
        Each webhook receives JSON payloads with an auto-generated <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">X-Webhook-Secret</code> header for verification.
      </p>

      {webhooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
          <Webhook className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">No webhooks yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add an endpoint to receive booking events.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh, i) => (
            <WebhookCard
              key={wh.id}
              webhook={wh}
              index={i}
              onChange={updated => updateWebhook(i, updated)}
              onRemove={() => removeWebhook(i)}
              onTest={sendTest}
              testing={testingId === wh.id}
            />
          ))}
        </div>
      )}

      <Button type="button" variant="outline" onClick={() => setWebhooks(list => [...list, createWebhook()])} className="w-full md:w-auto gap-2">
        <Plus className="w-4 h-4" />
        Add Webhook
      </Button>

      <div className="space-y-3">
        <SaveButton onClick={save} saving={saving} label="Save Webhooks" />
        <StatusAlert status={status} />
      </div>
    </SettingsSectionCard>
  );
}

export default function Settings() {
  const { user } = useOutletContext();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('email');

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Email, WhatsApp, SSO, and webhook integrations"
      />

      {!isAdmin ? (
        <EmptyState
          icon={Shield}
          title="Admin access required"
          description="Only administrators can view and manage system settings."
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto w-full grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 lg:inline-flex lg:h-10 lg:w-auto">
            <TabsTrigger
              value="email"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Email</span>
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="max-[360px]:text-[11px]">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger
              value="sso"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>SSO</span>
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <Webhook className="w-4 h-4 shrink-0" />
              <span>Webhooks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-0 space-y-6">
            <EmailSettings />
          </TabsContent>
          <TabsContent value="whatsapp" className="mt-0 space-y-6">
            <WhatsAppSettings />
          </TabsContent>
          <TabsContent value="sso" className="mt-0 space-y-6">
            <NexusSsoSettings />
          </TabsContent>
          <TabsContent value="webhooks" className="mt-0 space-y-6">
            <WebhookSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
