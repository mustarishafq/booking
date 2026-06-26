import { db } from '@/api/base44Client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { ComboboxTrigger, ComboboxContent } from '@/components/ui/combobox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, Trash2, Upload, ImageIcon, X, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ResourceCarePanel from '@/components/resources/ResourceCarePanel';
import { hasPermission } from '@/lib/permissions';

const PRICING_MODELS = [
  { value: 'hourly', label: 'Hourly (RM/hr)' },
  { value: 'daily', label: 'Daily (RM/day)' },
  { value: 'flat', label: 'Flat fee (one-time)' },
];

const defaultForm = {
  name: '', resource_type: '', description: '', capacity: '',
  pricing_model: 'hourly', rate: '', location: '', odometer_km: '', image_url: '', requires_approval: true,
  pic_user_id: '', amenities: '', status: 'active',
};

export default function ResourceFormDialog({ open, onClose, resource, user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');

  const isInternal = user?.user_type === 'internal';
  const canManageCare = hasPermission(user, 'manage_resources');

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
    enabled: open,
  });

  const existingTypes = useMemo(() => {
    const types = new Set(resources.map(r => r.resource_type).filter(Boolean));
    if (form.resource_type) types.add(form.resource_type);
    return [...types].sort((a, b) => a.localeCompare(b));
  }, [resources, form.resource_type]);

  const trimmedTypeSearch = typeSearch.trim();
  const canCreateType = trimmedTypeSearch
    && !existingTypes.some(t => t.toLowerCase() === trimmedTypeSearch.toLowerCase());

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
    enabled: open && user?.role === 'admin',
  });

  const approvedUsers = users.filter(u => u.approved);

  useEffect(() => {
    setForm(resource ? {
      name: resource.name || '',
      resource_type: resource.resource_type || '',
      description: resource.description || '',
      capacity: resource.capacity || '',
      pricing_model: resource.pricing_model || 'hourly',
      rate: resource.rate || '',
      location: resource.location || '',
      odometer_km: resource.odometer_km ?? '',
      image_url: resource.image_url || '',
      requires_approval: resource.requires_approval !== false,
      pic_user_id: resource.pic_user_id || '',
      amenities: (resource.amenities || []).join(', '),
      status: resource.status || 'active',
    } : defaultForm);
    setImageFile(null);
    setImagePreview('');
  }, [resource, open]);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const previewSrc = imagePreview || form.image_url;

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller');
      e.target.value = '';
      return;
    }

    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview('');
    set('image_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageUrl = form.image_url;

      if (imageFile) {
        setUploading(true);
        const result = await db.integrations.Core.UploadFile(imageFile);
        imageUrl = result.file_url || result.url || '';
        setUploading(false);
      }

      const data = {
        ...form,
        capacity: form.capacity ? Number(form.capacity) : 0,
        amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean),
        image_url: imageUrl,
        pic_user_id: form.pic_user_id || null,
        odometer_km: form.odometer_km !== '' ? Number(form.odometer_km) : null,
      };

      if (isInternal) {
        if (!resource) {
          data.rate = 0;
          data.pricing_model = 'hourly';
        } else {
          delete data.rate;
          delete data.pricing_model;
        }
      } else {
        data.rate = Number(form.rate);
      }

      if (resource) {
        await db.entities.Resource.update(resource.id, data);
        toast.success('Resource updated');
      } else {
        await db.entities.Resource.create(data);
        toast.success('Resource created');
      }

      queryClient.invalidateQueries({ queryKey: ['resources'] });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save resource');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await db.entities.Resource.delete(resource.id);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource deleted');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete resource');
    } finally {
      setDeleting(false);
    }
  };

  const isValid = isInternal
    ? form.name && form.resource_type
    : form.name && form.resource_type && form.rate !== '' && form.pricing_model;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Toyota Camry" />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Popover
                open={typeOpen}
                onOpenChange={(next) => {
                  setTypeOpen(next);
                  if (!next) setTypeSearch('');
                }}
              >
                <PopoverTrigger asChild>
                  <ComboboxTrigger aria-expanded={typeOpen}>
                    {form.resource_type ? (
                      <span className="text-foreground">{form.resource_type}</span>
                    ) : (
                      <span className="text-muted-foreground">e.g. Car, Room, Boat…</span>
                    )}
                  </ComboboxTrigger>
                </PopoverTrigger>
                <ComboboxContent>
                  <Command shouldFilter>
                    <CommandInput
                      placeholder="Search types…"
                      value={typeSearch}
                      onValueChange={setTypeSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {canCreateType ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-sm"
                            onClick={() => {
                              set('resource_type', trimmedTypeSearch);
                              setTypeOpen(false);
                              setTypeSearch('');
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Add &ldquo;{trimmedTypeSearch}&rdquo;
                          </button>
                        ) : (
                          'No matching type.'
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {existingTypes.map(type => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={() => {
                              set('resource_type', type);
                              setTypeOpen(false);
                              setTypeSearch('');
                            }}
                          >
                            <Check
                              className={cn(
                                'h-4 w-4 shrink-0',
                                form.resource_type === type ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {type}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {canCreateType && (
                        <CommandGroup forceMount>
                          <CommandItem
                            value={trimmedTypeSearch}
                            onSelect={() => {
                              set('resource_type', trimmedTypeSearch);
                              setTypeOpen(false);
                              setTypeSearch('');
                            }}
                          >
                            <Plus className="h-4 w-4 shrink-0" />
                            Add &ldquo;{trimmedTypeSearch}&rdquo;
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </ComboboxContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe this resource…" />
          </div>

          {!isInternal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>Rate (RM) *</Label>
                <Input type="number" step="0.01" min="0" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.00" />
              </div>
            </div>
          )}

          {isInternal && (
            <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2">
              Internal resources are free to book — pricing is not required.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Label>Odometer (km) <span className="text-muted-foreground text-xs">(optional — for vehicles)</span></Label>
            <Input type="number" min="0" step="0.1" value={form.odometer_km} onChange={e => set('odometer_km', e.target.value)} placeholder="Current mileage" />
          </div>

          <div className="space-y-2">
            <Label>Photo</Label>
            {previewSrc ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
                <img src={previewSrc} alt="Resource preview" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 h-8 gap-1"
                  onClick={clearImage}
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-full aspect-video rounded-xl border-2 border-dashed border-border',
                  'bg-muted/30 hover:bg-muted/50 transition-colors',
                  'flex flex-col items-center justify-center gap-2 text-muted-foreground',
                )}
              >
                <ImageIcon className="w-8 h-8 opacity-40" />
                <span className="text-sm">Tap to upload a photo</span>
                <span className="text-xs opacity-70">JPEG, PNG, WebP or GIF · max 5MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageSelect}
            />

            {previewSrc && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Replace photo
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Require approval</p>
              <p className="text-xs text-muted-foreground">
                Non-admin bookings for this resource must be approved before they are confirmed
              </p>
            </div>
            <Switch
              checked={form.requires_approval}
              onCheckedChange={v => set('requires_approval', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Person in charge (PIC)</Label>
            <Select
              value={form.pic_user_id || '__none__'}
              onValueChange={v => set('pic_user_id', v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select who gets booking notifications" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No PIC assigned</SelectItem>
                {approvedUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name?.trim() || u.email}
                    {u.role === 'admin' ? ' · Admin' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The PIC receives in-app notifications when someone books this resource. They do not need to be an admin.
            </p>
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

          {resource && (
            <ResourceCarePanel resource={resource} canManage={canManageCare} />
          )}

          <div className="flex justify-between gap-2 pt-2">
            {resource && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting || saving}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !isValid}>
                {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? 'Uploading…' : resource ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
