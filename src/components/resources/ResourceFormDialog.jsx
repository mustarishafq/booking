import { db } from '@/api/base44Client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';

const PRICING_MODELS = [
  { value: 'hourly', label: 'Hourly (RM/hr)' },
  { value: 'daily', label: 'Daily (RM/day)' },
  { value: 'flat', label: 'Flat fee (one-time $)' },
];

const defaultForm = {
  name: '', resource_type: '', description: '', capacity: '',
  pricing_model: 'hourly', rate: '', location: '', image_url: '', amenities: '', status: 'active',
};

export default function ResourceFormDialog({ open, onClose, resource }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    setForm(resource ? {
      name: resource.name || '',
      resource_type: resource.resource_type || '',
      description: resource.description || '',
      capacity: resource.capacity || '',
      pricing_model: resource.pricing_model || 'hourly',
      rate: resource.rate || '',
      location: resource.location || '',
      image_url: resource.image_url || '',
      amenities: (resource.amenities || []).join(', '),
      status: resource.status || 'active',
    } : defaultForm);
  }, [resource, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      capacity: form.capacity ? Number(form.capacity) : 0,
      rate: Number(form.rate),
      amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean),
    };
    if (resource) {
      await db.entities.Resource.update(resource.id, data);
    } else {
      await db.entities.Resource.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await db.entities.Resource.delete(resource.id);
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    setDeleting(false);
    onClose();
  };

  const isValid = form.name && form.resource_type && form.rate && form.pricing_model;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Toyota Camry" />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Input value={form.resource_type} onChange={e => set('resource_type', e.target.value)} placeholder="e.g. Car, Room, Boat…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe this resource…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pricing Model *</Label>
              <Select value={form.pricing_model} onValueChange={v => set('pricing_model', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_MODELS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rate ($) *</Label>
              <Input type="number" step="0.01" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Capacity <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="Leave blank if N/A" />
            </div>
            <div className="space-y-1.5">
              <Label>Location / ID</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Bay 3, Floor 2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
          </div>

          <div className="space-y-1.5">
            <Label>Features / Amenities <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
            <Input value={form.amenities} onChange={e => set('amenities', e.target.value)} placeholder="e.g. GPS, AC, Projector" />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['active', 'maintenance', 'inactive'].map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            {resource && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !isValid}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {resource ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}