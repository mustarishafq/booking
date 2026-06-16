import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceCareApi } from '@/api/resourceCare';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2, Plus, Wrench, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  CARE_CATEGORIES, INTERVAL_TYPES, defaultCareItemForm, intervalTypeLabel,
} from '@/lib/resourceCareUtils';

function TemplateItemForm({ form, setForm }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Label *</Label>
        <Input value={form.label} onChange={e => set('label', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CARE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Schedule type</Label>
          <Select value={form.interval_type} onValueChange={v => set('interval_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INTERVAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.interval_type !== 'manual' && (
        <div className="space-y-1.5">
          <Label>Interval value</Label>
          <Input type="number" min="1" value={form.interval_value} onChange={e => set('interval_value', e.target.value)} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Remind days before</Label>
        <Input type="number" min="0" value={form.remind_days_before} onChange={e => set('remind_days_before', e.target.value)} />
      </div>
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
        <p className="text-sm font-medium">Block booking when overdue</p>
        <Switch checked={form.block_when_overdue} onCheckedChange={v => set('block_when_overdue', v)} />
      </div>
    </div>
  );
}

export default function CareTemplatesSettings() {
  const queryClient = useQueryClient();
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ resource_type: '', description: '' });
  const [itemDialog, setItemDialog] = useState(null);
  const [itemForm, setItemForm] = useState(defaultCareItemForm);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['resource-care-templates'],
    queryFn: () => resourceCareApi.listTemplates(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['resource-care-templates'] });
  };

  const saveTemplate = async () => {
    if (!templateForm.resource_type.trim()) {
      toast.error('Resource type is required');
      return;
    }
    setSaving(true);
    try {
      await resourceCareApi.createTemplate(templateForm);
      toast.success('Template created');
      setShowTemplateForm(false);
      setTemplateForm({ resource_type: '', description: '' });
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async () => {
    if (!itemForm.label.trim() || !itemDialog) return;
    setSaving(true);
    try {
      const payload = {
        label: itemForm.label.trim(),
        category: itemForm.category,
        interval_type: itemForm.interval_type,
        interval_value: itemForm.interval_value ? Number(itemForm.interval_value) : null,
        remind_days_before: Number(itemForm.remind_days_before) || 7,
        block_when_overdue: itemForm.block_when_overdue,
      };
      if (editItem) {
        await resourceCareApi.updateTemplateItem(editItem.id, payload);
        toast.success('Template item updated');
      } else {
        await resourceCareApi.createTemplateItem(itemDialog.id, payload);
        toast.success('Template item added');
      }
      setItemDialog(null);
      setEditItem(null);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.kind === 'template') {
        await resourceCareApi.deleteTemplate(deleteTarget.id);
        toast.success('Template deleted');
      } else {
        await resourceCareApi.deleteTemplateItem(deleteTarget.id);
        toast.success('Template item deleted');
      }
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const openAddItem = (template) => {
    setItemDialog(template);
    setEditItem(null);
    setItemForm(defaultCareItemForm);
  };

  const openEditItem = (template, item) => {
    setItemDialog(template);
    setEditItem(item);
    setItemForm({
      label: item.label,
      category: item.category,
      interval_type: item.interval_type,
      interval_value: item.interval_value ?? '',
      remind_days_before: item.remind_days_before ?? 7,
      block_when_overdue: !!item.block_when_overdue,
      notes: '',
      next_due_at: '',
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Care templates by resource type
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Default upkeep schedules applied when new resources are created or when you click &ldquo;Apply template&rdquo;.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowTemplateForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New type
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading templates…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            templates.map(template => (
              <div key={template.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{template.resource_type}</p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openAddItem(template)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget({ kind: 'template', id: template.id, label: template.resource_type })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {template.items?.length ? (
                  <div className="space-y-2">
                    {template.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {intervalTypeLabel(item.interval_type)}
                            {item.interval_value ? ` · every ${item.interval_value}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.block_when_overdue && (
                            <Badge variant="outline" className="text-xs">Blocks</Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(template, item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ kind: 'item', id: item.id, label: item.label })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No default items — add some for this type.</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New care template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Resource type *</Label>
              <Input value={templateForm.resource_type} onChange={e => setTemplateForm(f => ({ ...f, resource_type: e.target.value }))} placeholder="e.g. Car, Hall" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={templateForm.description} onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTemplateForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemDialog} onOpenChange={(open) => !open && setItemDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit' : 'Add'} item — {itemDialog?.resource_type}</DialogTitle>
          </DialogHeader>
          <TemplateItemForm form={itemForm} setForm={setItemForm} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setItemDialog(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
