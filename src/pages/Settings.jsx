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
  Shield, CheckCircle2, Mail, Send, Bell, X,
  MessageCircle, Settings as SettingsIcon, Webhook, Plus, Trash2,
  Eye, EyeOff, Copy, RefreshCw, KeyRound, Database, Loader2, ScrollText, Wrench, Brain,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserIdentity } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CareTemplatesSettings from '@/components/settings/CareTemplatesSettings';

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
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success('Settings saved.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) return;
    setTesting(true);
    try {
      const res = await fetch(`${API_BASE}/settings/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      if (data.ok) toast.success(data.message);
      else toast.error(data.message);
    } catch (e) {
      toast.error(e.message);
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

      <SaveButton onClick={save} saving={saving} />

      <Separator />

      <SettingsSubsection title="Send Test Email" icon={Send}>
        <div className="flex flex-col md:flex-row gap-2">
          <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="recipient@example.com" type="email" className="flex-1 min-w-0" />
          <Button variant="outline" onClick={sendTest} disabled={testing || !testTo} className="w-full md:w-auto shrink-0">
            <Send className="w-4 h-4 mr-1.5" />{testing ? 'Sending…' : 'Send Test'}
          </Button>
        </div>
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
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success('Settings saved.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) return;
    setTesting(true);
    try {
      const res = await fetch(`${API_BASE}/settings/test-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      if (data.ok) toast.success(data.message);
      else toast.error(data.message);
    } catch (e) {
      toast.error(e.message);
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

      <SaveButton onClick={save} saving={saving} />

      <Separator />

      <SettingsSubsection title="Send Test Message" icon={Send}>
        <div className="flex flex-col md:flex-row gap-2">
          <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="60123456789" className="flex-1 min-w-0" />
          <Button variant="outline" onClick={sendTest} disabled={testing || !testTo} className="w-full md:w-auto shrink-0">
            <Send className="w-4 h-4 mr-1.5" />{testing ? 'Sending…' : 'Send Test'}
          </Button>
        </div>
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
      toast.success('Nexus SSO settings saved.');
    } catch (e) {
      toast.error(e.message);
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

      <SaveButton onClick={save} saving={saving} label="Save SSO Settings" />
    </SettingsSectionCard>
  );
}

function McpApiSettings() {
  const [cfg, setCfg] = useState({
    api_key: '',
    api_key_set: false,
    rate_limit: 60,
    env_key_configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedCatalog, setCopiedCatalog] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const resolvedCatalogUrl = API_BASE.startsWith('http')
    ? `${API_BASE.replace(/\/api$/, '')}/api/mcp/v1/catalog`
    : `${window.location.origin}/api/mcp/v1/catalog`;

  useEffect(() => {
    fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(settings => {
        const mcp = settings.mcp_api || {};
        setCfg({
          api_key: '',
          api_key_set: !!mcp.api_key_set,
          rate_limit: mcp.rate_limit || 60,
          env_key_configured: !!mcp.env_key_configured,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    if (cfg.api_key && cfg.api_key.length < 32) {
      toast.error('API key must be at least 32 characters.');
      return;
    }
    if (!cfg.api_key && !cfg.api_key_set && !cfg.env_key_configured) {
      toast.error('Generate or paste an API key before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        mcp_api: {
          rate_limit: Number(cfg.rate_limit) || 60,
        },
      };
      if (cfg.api_key) payload.mcp_api.api_key = cfg.api_key;

      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      if (cfg.api_key) setCfg(c => ({ ...c, api_key: '', api_key_set: true }));
      toast.success('MCP API settings saved.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (cfg.api_key && cfg.api_key.length >= 32 && !cfg.api_key_set) {
      toast.error('Save the new API key before testing the catalog connection.');
      return;
    }

    setTesting(true);
    try {
      const res = await fetch(`${API_BASE}/settings/test-mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(cfg.api_key ? { api_key: cfg.api_key } : {}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message);
      toast.success(data.message);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const copyCatalogUrl = async () => {
    try {
      await navigator.clipboard.writeText(resolvedCatalogUrl);
      setCopiedCatalog(true);
      setTimeout(() => setCopiedCatalog(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const copyApiKey = async () => {
    if (!cfg.api_key) return;
    try {
      await navigator.clipboard.writeText(cfg.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const isConfigured = cfg.api_key_set || cfg.env_key_configured;

  if (loading) return <SettingsSectionSkeleton />;

  return (
    <SettingsSectionCard
      icon={Brain}
      iconColor="info"
      title="Nexus Brain MCP API"
      description="Expose this booking system to EMZI Nexus Brain via the MCP catalog"
    >
      {cfg.env_key_configured && (
        <div className="rounded-xl border border-info/30 bg-info/5 px-3.5 py-3 text-sm text-muted-foreground">
          An MCP API key is also set via the <code className="bg-muted px-1 py-0.5 rounded text-[11px]">MCP_API_KEY</code> environment variable.
          Environment keys always remain valid alongside any key saved here.
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Catalog URL</Label>
          <p className="text-xs text-muted-foreground">
            Register this URL in Nexus Brain → Connected Systems as the catalog endpoint.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={resolvedCatalogUrl} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={copyCatalogUrl} className="shrink-0 gap-1.5">
              {copiedCatalog ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copiedCatalog ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">API Key</Label>
          <p className="text-xs text-muted-foreground">
            Min. 32 characters. Use the same value in Nexus Brain when connecting this system.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Input
                type={showKey ? 'text' : 'password'}
                value={cfg.api_key}
                onChange={e => setCfg(c => ({ ...c, api_key: e.target.value, api_key_set: false }))}
                placeholder={
                  cfg.api_key_set
                    ? '••••••••  (saved — enter new to change)'
                    : 'Generate or paste an API key'
                }
                className="font-mono text-xs pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey(v => !v)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCfg(c => ({ ...c, api_key: generateApiKey(), api_key_set: false }))}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Generate
            </Button>
            {cfg.api_key && (
              <Button type="button" variant="outline" onClick={copyApiKey} className="shrink-0 gap-1.5">
                {copiedKey ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copiedKey ? 'Copied' : 'Copy key'}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <Label className="text-sm font-medium">Rate limit (requests / minute)</Label>
          <Input
            type="number"
            min={1}
            max={1000}
            value={cfg.rate_limit}
            onChange={e => setCfg(c => ({ ...c, rate_limit: e.target.value }))}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <SaveButton onClick={save} saving={saving} label="Save MCP Settings" />
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={testing || (!isConfigured && !cfg.api_key)}
            className="gap-1.5"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? 'Testing…' : 'Test catalog connection'}
          </Button>
        </div>

        {isConfigured && (
          <p className="text-xs text-success flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            MCP API key is configured{cfg.env_key_configured && cfg.api_key_set ? ' (env + settings)' : ''}.
          </p>
        )}
      </div>
    </SettingsSectionCard>
  );
}

function WebhookSettings() {
  const [webhooks, setWebhooks] = useState([]);
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
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ webhooks }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success('Webhooks saved.');
    } catch (e) {
      toast.error(e.message);
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

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => setWebhooks(list => [...list, createWebhook()])} className="w-full sm:w-auto gap-2">
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>

        <SaveButton onClick={save} saving={saving} label="Save Webhooks" />
      </div>
    </SettingsSectionCard>
  );
}

const CLEAR_CATEGORY_META = {
  bookings:      { label: 'Bookings', description: 'All reservations and booking history' },
  transactions:  { label: 'Transactions', description: 'Credit top-ups, charges, and ledger entries' },
  resources:     { label: 'Resources', description: 'All bookable resources and their settings' },
  rooms:         { label: 'Rooms', description: 'All room listings' },
  notifications: { label: 'Notifications', description: 'In-app notification history for all users' },
  roles:         { label: 'Custom roles', description: 'Custom roles and permissions (built-in user/admin roles are kept)' },
  users:         { label: 'Non-admin users', description: 'Remove all users except administrators (you stay signed in)' },
  user_credits:  { label: 'Credit balances', description: 'Reset all user credit balances to zero' },
  uploads:       { label: 'Uploaded images', description: 'Delete files uploaded for resources and rooms' },
};

const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  bulk_create: 'Bulk created',
  clear_data: 'Cleared data',
  invite: 'Invited',
  approve: 'Approved',
  reject: 'Rejected',
  register: 'Registered',
  password_change: 'Password changed',
  password_reset: 'Password reset',
  upload: 'Uploaded',
  sso_login: 'SSO sign-in',
  sso_register: 'SSO user created',
};

function formatAuditTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function AuditLogViewer({ refreshKey = 0 }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    fetch(`${API_BASE}/audit-logs?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, [refreshKey]);

  if (loading) return <SettingsSectionSkeleton />;

  return (
    <SettingsSectionCard
      icon={ScrollText}
      iconColor="info"
      title="Audit Log"
      description="Immutable record of data changes and admin actions. Audit logs are never removed by Clear Data."
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing latest {logs.length.toLocaleString()} of {total.toLocaleString()} entries
        </p>
        <Button type="button" variant="outline" size="sm" onClick={loadLogs} className="shrink-0 gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
          <ScrollText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">No audit entries yet</p>
          <p className="text-sm text-muted-foreground mt-1">Data changes will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
          {logs.map(log => (
            <div key={log.id} className="rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{log.summary || `${log.action} ${log.entity_type}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ACTION_LABELS[log.action] || log.action}
                    {' · '}
                    {log.entity_type}
                    {log.entity_id ? ` · ${log.entity_id}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatAuditTime(log.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0">By</span>
                {log.actor_email ? (
                  <UserIdentity
                    email={log.actor_email}
                    name={log.actor_name || log.actor_email}
                    avatarUrl={log.actor_avatar_url}
                    className="min-w-0"
                    labelClassName="text-xs text-muted-foreground"
                  />
                ) : (
                  <span>system</span>
                )}
                {log.ip_address ? <span className="shrink-0">· {log.ip_address}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsSectionCard>
  );
}

function DataManagementSettings() {
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState({});
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const loadSummary = () => {
    setLoading(true);
    fetch(`${API_BASE}/settings/data-summary`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => {
        setCounts(data.counts || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadSummary(); }, []);

  const categoryKeys = Object.keys(CLEAR_CATEGORY_META);
  const selectedKeys = categoryKeys.filter(k => selected[k]);
  const allSelected = categoryKeys.length > 0 && selectedKeys.length === categoryKeys.length;
  const canClear = selectedKeys.length > 0 && confirmText === 'CLEAR';

  const toggleAll = (checked) => {
    const next = {};
    categoryKeys.forEach(k => { next[k] = checked; });
    setSelected(next);
  };

  const toggleCategory = (key, checked) => {
    setSelected(prev => ({ ...prev, [key]: checked }));
  };

  const clearData = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${API_BASE}/settings/clear-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ categories: selectedKeys, confirm: confirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Selected data cleared successfully.');
      setConfirmText('');
      setSelected({});
      setConfirmOpen(false);
      loadSummary();
      setAuditRefreshKey(k => k + 1);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <SettingsSectionSkeleton />;

  return (
    <>
      <SettingsSectionCard
        icon={Database}
        iconColor="warning"
        title="Clear Data"
        description="Permanently remove selected data to start fresh. Settings and admin accounts are not affected unless you choose those categories."
      >
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 sm:p-4">
          <p className="text-sm text-destructive font-medium">This action cannot be undone.</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Choose what to remove, type <span className="font-mono font-semibold">CLEAR</span> below, then confirm.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="clear-select-all"
              checked={allSelected}
              onCheckedChange={v => toggleAll(!!v)}
            />
            <Label htmlFor="clear-select-all" className="text-sm font-medium cursor-pointer">
              Select all
            </Label>
          </div>
          <span className="text-xs text-muted-foreground">
            {selectedKeys.length} of {categoryKeys.length} selected
          </span>
        </div>

        <div className="space-y-2">
          {categoryKeys.map(key => {
            const meta = CLEAR_CATEGORY_META[key];
            const count = counts[key] ?? 0;
            return (
              <div
                key={key}
                className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4"
              >
                <Checkbox
                  id={`clear-${key}`}
                  checked={!!selected[key]}
                  onCheckedChange={v => toggleCategory(key, !!v)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Label htmlFor={`clear-${key}`} className="text-sm font-medium cursor-pointer leading-snug">
                    {meta.label}
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0 pt-0.5">
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Type CLEAR to confirm</Label>
          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="CLEAR"
            className="font-mono"
            autoComplete="off"
          />
        </div>

        <Button
          variant="destructive"
          disabled={!canClear}
          onClick={() => setConfirmOpen(true)}
          className="w-full md:w-auto"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Clear Selected Data
        </Button>
      </SettingsSectionCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear selected data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>The following will be permanently deleted:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {selectedKeys.map(key => (
                    <li key={key}>
                      {CLEAR_CATEGORY_META[key].label}
                      {' '}
                      ({(counts[key] ?? 0).toLocaleString()} records)
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={clearData}
              disabled={clearing}
            >
              {clearing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuditLogViewer refreshKey={auditRefreshKey} />
    </>
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
        description="Email, WhatsApp, SSO, MCP, webhooks, and data management"
      />

      {!isAdmin ? (
        <EmptyState
          icon={Shield}
          title="Admin access required"
          description="Only administrators can view and manage system settings."
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 p-1 lg:inline-flex lg:h-10 lg:w-auto">
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
              value="mcp"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <Brain className="w-4 h-4 shrink-0" />
              <span>MCP</span>
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <Webhook className="w-4 h-4 shrink-0" />
              <span>Webhooks</span>
            </TabsTrigger>
            <TabsTrigger
              value="care"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <Wrench className="w-4 h-4 shrink-0" />
              <span>Care</span>
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center justify-center min-h-[44px] lg:min-h-0"
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Data</span>
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
          <TabsContent value="mcp" className="mt-0 space-y-6">
            <McpApiSettings />
          </TabsContent>
          <TabsContent value="webhooks" className="mt-0 space-y-6">
            <WebhookSettings />
          </TabsContent>
          <TabsContent value="care" className="mt-0 space-y-6">
            <CareTemplatesSettings />
          </TabsContent>
          <TabsContent value="data" className="mt-0 space-y-6">
            <DataManagementSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
