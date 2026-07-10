import { db } from '@/api/base44Client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import {
  Loader2, Trash2, Upload, ImageIcon, X, Check, Plus, Link2, MapPin, Gauge, Users, Tag, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ResourceCarePanel from '@/components/resources/ResourceCarePanel';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { hasPermission } from '@/lib/permissions';

const PRICING_MODELS = [
  { value: 'hourly', label: 'Hourly (RM/hr)' },
  { value: 'daily', label: 'Daily (RM/day)' },
  { value: 'flat', label: 'Flat fee (one-time)' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

const defaultForm = {
  name: '', resource_type: '', pair_with_types: [], description: '', capacity: '',
  pricing_model: 'hourly', rate: '', location: '', phone: '', odometer_km: '', image_url: '', requires_approval: true,
  pic_user_id: '', amenities: '', status: 'active',
};

function Section({ title, description, children, className }) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function ResourceFormDialog({ open, onClose, resource, user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    const pairTypes = Array.isArray(resource?.pair_with_types)
      ? resource.pair_with_types.filter(Boolean)
      : (resource?.pair_with_type ? [resource.pair_with_type] : []);

    setForm(resource ? {
      name: resource.name || '',
      resource_type: resource.resource_type || '',
      pair_with_types: pairTypes,
      description: resource.description || '',
      capacity: resource.capacity || '',
      pricing_model: resource.pricing_model || 'hourly',
      rate: resource.rate || '',
      location: resource.location || '',
      phone: resource.phone || '',
      odometer_km: resource.odometer_km ?? '',
      image_url: resource.image_url || '',
      requires_approval: resource.requires_approval !== false,
      pic_user_id: resource.pic_user_id || '',
      amenities: (resource.amenities || []).join(', '),
      status: resource.status || 'active',
    } : defaultForm);
    setImageFile(null);
    setImagePreview('');
    setTypeOpen(false);
    setTypeSearch('');
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

  const togglePairType = (type) => {
    setForm(f => {
      const current = f.pair_with_types || [];
      return {
        ...f,
        pair_with_types: current.includes(type)
          ? current.filter(t => t !== type)
          : [...current, type],
      };
    });
  };

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
        phone: form.phone?.trim() || null,
        pair_with_types: Array.isArray(form.pair_with_types) ? form.pair_with_types : [],
        pair_with_type: null,
        pairing_role: 'none',
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
      setConfirmSave(false);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save resource');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const isValid = isInternal
    ? form.name && form.resource_type
    : form.name && form.resource_type && form.rate !== '' && form.pricing_model;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await db.entities.Resource.delete(resource.id);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource deleted');
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete resource');
    } finally {
      setDeleting(false);
    }
  };

  const requestSave = () => {
    if (!isValid) return;
    setConfirmSave(true);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-2xl max-h-[min(90dvh,720px)] overflow-hidden rounded-2xl p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-border shrink-0">
          <DialogTitle>{resource ? 'Edit resource' : 'Add resource'}</DialogTitle>
          <DialogDescription>
            {resource
              ? 'Update details, photo, and who this can be booked with.'
              : 'Name it, set a type, and add a photo so people can pick it easily.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-8 flex-1 min-h-0 overflow-y-auto">
          {/* Basics + photo */}
          <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-5">
            <div className="space-y-2">
              <Label>Photo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelect}
              />
              {previewSrc ? (
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted group">
                  <img src={previewSrc} alt="Resource preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={clearImage}
                      aria-label="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'w-full aspect-[4/3] rounded-xl border border-dashed border-border',
                    'bg-muted/40 hover:bg-muted/60 hover:border-primary/40 transition-colors',
                    'flex flex-col items-center justify-center gap-1.5 text-muted-foreground',
                  )}
                >
                  <ImageIcon className="w-7 h-7 opacity-40" />
                  <span className="text-xs font-medium">Add photo</span>
                  <span className="text-[10px] opacity-70">Max 5MB</span>
                </button>
              )}
            </div>

            <div className="space-y-4 min-w-0">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Toyota Camry"
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <ComboboxTrigger aria-expanded={typeOpen} className="h-10">
                        {form.resource_type ? (
                          <span className="font-medium text-foreground flex items-center gap-1.5 min-w-0">
                            <Tag className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{form.resource_type}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Car, Room, Driver…</span>
                        )}
                      </ComboboxTrigger>
                    </PopoverTrigger>
                    <ComboboxContent>
                      <Command shouldFilter>
                        <CommandInput
                          placeholder="Search or create type…"
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

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set('status', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Short description for the booking list…"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Details */}
          <Section title="Details" description="Optional info shown on the resource card.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-muted-foreground font-normal">
                  <Users className="w-3.5 h-3.5" />
                  Capacity
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={form.capacity}
                  onChange={e => set('capacity', e.target.value)}
                  placeholder="Seats / pax"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-muted-foreground font-normal">
                  <MapPin className="w-3.5 h-3.5" />
                  Location
                </Label>
                <Input
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="Bay 3, Floor 2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-muted-foreground font-normal">
                  <Phone className="w-3.5 h-3.5" />
                  Phone
                </Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="e.g. 012-345 6789"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-muted-foreground font-normal">
                  <Gauge className="w-3.5 h-3.5" />
                  Odometer (km)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.odometer_km}
                  onChange={e => set('odometer_km', e.target.value)}
                  placeholder="Mileage"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Features</Label>
              <Input
                value={form.amenities}
                onChange={e => set('amenities', e.target.value)}
                placeholder="GPS, AC, Projector — comma separated"
              />
            </div>
          </Section>

          <div className="h-px bg-border" />

          {/* Pricing */}
          <Section
            title="Pricing"
            description={isInternal
              ? 'Internal bookings are free — no rate needed.'
              : 'How this resource is charged when booked.'}
          >
            {isInternal ? (
              <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-muted-foreground">
                Free for internal users.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Model *</Label>
                  <Select value={form.pricing_model} onValueChange={v => set('pricing_model', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICING_MODELS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Rate (RM) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.rate}
                    onChange={e => set('rate', e.target.value)}
                    placeholder="0.00"
                    className="h-10"
                  />
                </div>
              </div>
            )}
          </Section>

          <div className="h-px bg-border" />

          {/* Pair with */}
          <Section
            title="Book together"
            description="When someone books this resource, they can optionally add one of these types in the same flow."
          >
            {existingTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border px-4 py-3">
                Create a type above first, then choose what this can pair with.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {existingTypes.map(type => {
                  const selected = (form.pair_with_types || []).includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => togglePairType(type)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {selected ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5 opacity-50" />}
                      {type}
                    </button>
                  );
                })}
              </div>
            )}
            {(form.pair_with_types || []).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {(form.pair_with_types || []).join(', ')}
              </p>
            )}
          </Section>

          <div className="h-px bg-border" />

          {/* Access */}
          <Section title="Access & notifications">
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-4 py-3 bg-card">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Require approval</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Non-admins need approval before the booking is confirmed
                  </p>
                </div>
                <Switch
                  checked={form.requires_approval}
                  onCheckedChange={v => set('requires_approval', v)}
                />
              </div>
              <div className="px-4 py-3 space-y-2 bg-card">
                <Label className="text-sm font-medium">Person in charge</Label>
                <Select
                  value={form.pic_user_id || '__none__'}
                  onValueChange={v => set('pic_user_id', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Who gets booking notifications" />
                  </SelectTrigger>
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
                  Notified when this resource is booked. Does not need to be an admin.
                </p>
              </div>
            </div>
          </Section>

          {resource && (
            <>
              <div className="h-px bg-border" />
              <Section title="Care & upkeep">
                <ResourceCarePanel resource={resource} canManage={canManageCare} />
              </Section>
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border shrink-0 bg-background flex items-center gap-2">
          {resource && (
            <Button
              variant="outline"
              size="lg"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive shrink-0 px-3"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting || saving}
              aria-label="Delete resource"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
          <div className="flex gap-2 ml-auto w-full sm:w-auto min-w-0">
            <Button variant="outline" size="lg" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={requestSave}
              disabled={saving || !isValid}
              className="flex-1 sm:flex-none min-w-0 shadow-md shadow-primary/20"
            >
              {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
              {uploading ? 'Uploading…' : resource ? 'Save changes' : 'Create resource'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmActionDialog
      open={confirmSave}
      onOpenChange={setConfirmSave}
      title={resource ? 'Save resource changes?' : 'Create this resource?'}
      description={
        resource
          ? `Update “${form.name || resource.name}” with the new details?`
          : `Create “${form.name || 'this resource'}”?`
      }
      confirmLabel={resource ? 'Save changes' : 'Create resource'}
      loading={saving}
      onConfirm={handleSave}
    />

    <ConfirmActionDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title={`Delete “${resource?.name || 'this resource'}”?`}
      description="This permanently deletes the resource. Existing bookings are not removed."
      confirmLabel="Delete"
      variant="destructive"
      loading={deleting}
      onConfirm={handleDelete}
    />
    </>
  );
}
