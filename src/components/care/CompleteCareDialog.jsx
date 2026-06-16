import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/base44Client';
import { resourceCareApi } from '@/api/resourceCare';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateInput } from '@/components/ui/date-input';
import { Loader2, Upload, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CompleteCareDialog({
  item,
  resourceOdometer = '',
  open,
  onClose,
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [notes, setNotes] = useState('');
  const [odometer, setOdometer] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setNotes('');
    setNextDue('');
    setOdometer(resourceOdometer ?? '');
    setProofFile(null);
    setProofPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open, item, resourceOdometer]);

  useEffect(() => {
    return () => {
      if (proofPreview.startsWith('blob:')) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  const handleProofSelect = (e) => {
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

    if (proofPreview.startsWith('blob:')) {
      URL.revokeObjectURL(proofPreview);
    }

    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const clearProof = () => {
    if (proofPreview.startsWith('blob:')) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofFile(null);
    setProofPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!item) return;
    if (!proofFile) {
      toast.error('Please upload a proof image');
      return;
    }

    setSaving(true);
    try {
      setUploading(true);
      const upload = await db.integrations.Core.UploadFile(proofFile);
      const proofImageUrl = upload.file_url || upload.url || '';
      setUploading(false);

      if (!proofImageUrl) {
        throw new Error('Upload failed — no image URL returned');
      }

      await resourceCareApi.completeItem(item.id, {
        notes,
        proof_image_url: proofImageUrl,
        usage_reading: item.interval_type === 'odometer' && odometer !== ''
          ? Number(odometer) : undefined,
        next_due_at: item.interval_type === 'manual' ? nextDue || undefined : undefined,
      });

      toast.success('Marked as done');
      queryClient.invalidateQueries({ queryKey: ['care-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['resource-care-items'] });
      queryClient.invalidateQueries({ queryKey: ['resource-care-summary'] });
      queryClient.invalidateQueries({ queryKey: ['care-history'] });
      queryClient.invalidateQueries({ queryKey: ['resource-care-history', item?.resource_id] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to complete');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark complete: {item?.label}</DialogTitle>
        </DialogHeader>
        {item?.resource_name && (
          <p className="text-sm text-muted-foreground -mt-2">{item.resource_name}</p>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Proof image *</Label>
            <p className="text-xs text-muted-foreground">
              Upload a photo as evidence this care task was completed (receipt, inspection photo, etc.)
            </p>
            {proofPreview ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
                <img src={proofPreview} alt="Proof preview" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 h-8 gap-1"
                  onClick={clearProof}
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
                <span className="text-sm">Tap to upload proof photo</span>
                <span className="text-xs opacity-70">JPEG, PNG, WebP or GIF · max 5MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleProofSelect}
            />
            {proofPreview && (
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

          {item?.interval_type === 'odometer' && (
            <div className="space-y-1.5">
              <Label>Current odometer (km)</Label>
              <Input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} />
            </div>
          )}

          {item?.interval_type === 'manual' && (
            <div className="space-y-1.5">
              <Label>Next due date</Label>
              <DateInput value={nextDue} onChange={e => setNextDue(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !proofFile}>
            {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {uploading ? 'Uploading…' : 'Mark done'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
