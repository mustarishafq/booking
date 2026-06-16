import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceCareApi } from '@/api/resourceCare';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, CheckCircle2, Wrench, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  CARE_CATEGORIES, INTERVAL_TYPES, CARE_STATUS_META, formatCareDue,
  defaultCareItemForm, intervalTypeLabel,
} from '@/lib/resourceCareUtils';
import { cn } from '@/lib/utils';
import CompleteCareDialog from '@/components/care/CompleteCareDialog';
import ResourceCareHistory from '@/components/care/ResourceCareHistory';

function CareItemForm({ form, setForm, showOdometerHint }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const needsInterval = form.interval_type !== 'manual';
  const needsManualDate = form.interval_type === 'manual';

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Label *</Label>
        <Input value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Deep clean" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CARE_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Schedule type</Label>
          <Select value={form.interval_type} onValueChange={v => set('interval_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INTERVAL_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {needsInterval && (
        <div className="space-y-1.5">
          <Label>Interval value</Label>
          <Input
            type="number"
            min="1"
            value={form.interval_value}
            onChange={e => set('interval_value', e.target.value)}
            placeholder={form.interval_type === 'odometer' ? '10000' : '90'}
          />
          <p className="text-xs text-muted-foreground">
            {INTERVAL_TYPES.find(t => t.value === form.interval_type)?.hint}
          </p>
        </div>
      )}
      {needsManualDate ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Next due date</Label>
            <DateInput value={form.next_due_at} onChange={e => set('next_due_at', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Remind days before</Label>
            <Input
              type="number"
              min="0"
              value={form.remind_days_before}
              onChange={e => set('remind_days_before', e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Remind days before</Label>
          <Input
            type="number"
            min="0"
            value={form.remind_days_before}
            onChange={e => set('remind_days_before', e.target.value)}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
        <div>
          <p className="text-sm font-medium">Block booking when overdue</p>
          <p className="text-xs text-muted-foreground">Sets resource to maintenance and rejects new bookings</p>
        </div>
        <Switch checked={form.block_when_overdue} onCheckedChange={v => set('block_when_overdue', v)} />
      </div>
      {showOdometerHint && form.interval_type === 'odometer' && (
        <p className="text-xs text-muted-foreground rounded-lg border px-3 py-2 bg-muted/40">
          Update odometer on the resource when marking this item complete.
        </p>
      )}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>
    </div>
  );
}

export default function ResourceCarePanel({ resource, canManage }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultCareItemForm);
  const [completeItem, setCompleteItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const resourceId = resource?.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['resource-care-items', resourceId],
    queryFn: () => resourceCareApi.listItems(resourceId),
    enabled: !!resourceId,
  });

  const openAdd = () => {
    setEditItem(null);
    setForm(defaultCareItemForm);
    setShowAdd(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      label: item.label,
      category: item.category,
      interval_type: item.interval_type,
      interval_value: item.interval_value ?? '',
      next_due_at: item.due_date || item.next_due_at?.slice?.(0, 10) || '',
      remind_days_before: item.remind_days_before ?? 7,
      block_when_overdue: !!item.block_when_overdue,
      notes: item.notes || '',
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Label is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        category: form.category,
        interval_type: form.interval_type,
        interval_value: form.interval_value ? Number(form.interval_value) : null,
        next_due_at: form.interval_type === 'manual' ? form.next_due_at || null : null,
        remind_days_before: Number(form.remind_days_before) || 7,
        block_when_overdue: form.block_when_overdue,
        notes: form.notes || null,
      };
      if (editItem) {
        await resourceCareApi.updateItem(editItem.id, payload);
        toast.success('Care item updated');
      } else {
        await resourceCareApi.createItem({ ...payload, resource_id: resourceId });
        toast.success('Care item added');
      }
      queryClient.invalidateQueries({ queryKey: ['resource-care-items', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-care-history', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-care-summary'] });
      setShowAdd(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await resourceCareApi.deleteItem(deleteItem.id);
      toast.success('Care item removed');
      queryClient.invalidateQueries({ queryKey: ['resource-care-items', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-care-history', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setDeleteItem(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async () => {
    setApplying(true);
    try {
      const result = await resourceCareApi.applyTemplate(resourceId);
      toast.success(result.applied ? `Applied ${result.applied} template item(s)` : 'Template already applied');
      queryClient.invalidateQueries({ queryKey: ['resource-care-items', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-care-history', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    } catch (err) {
      toast.error(err.message || 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  if (!resourceId) return null;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Wrench className="w-4 h-4" />
            Care & upkeep
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Service schedules, compliance dates, and usage-based reminders
          </p>
        </div>
        {canManage && (
          <div className="flex gap-1.5 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={handleApplyTemplate} disabled={applying}>
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span className="ml-1 hidden sm:inline">Template</span>
            </Button>
            <Button type="button" size="sm" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading care items…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center">
          No care items yet.{canManage ? ' Apply a type template or add items manually.' : ''}
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map(item => {
            const meta = CARE_STATUS_META[item.status] || CARE_STATUS_META.ok;
            return (
              <div key={item.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {intervalTypeLabel(item.interval_type)}
                      {item.last_done_at ? ` · Last done ${item.last_done_at.slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-xs', meta.className)}>
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Next: {formatCareDue(item)}
                  {item.block_when_overdue ? ' · Blocks booking when overdue' : ''}
                </p>
                {canManage && (
                  <div className="flex gap-1.5 flex-wrap">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCompleteItem(item)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setDeleteItem(item)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit care item' : 'Add care item'}</DialogTitle>
          </DialogHeader>
          <CareItemForm form={form} setForm={setForm} showOdometerHint />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CompleteCareDialog
        item={completeItem}
        resourceOdometer={resource?.odometer_km ?? ''}
        open={!!completeItem}
        onClose={() => setCompleteItem(null)}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove care item?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteItem?.label}&rdquo; and its completion history will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResourceCareHistory resourceId={resourceId} />
    </div>
  );
}
