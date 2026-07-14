import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, CheckCircle2, Calendar } from 'lucide-react';
import { careCategoryLabel, formatCareCompletedAt } from '@/lib/resourceCareUtils';
import { UserIdentity } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

export default function CareHistoryProofDialog({ entry, onClose }) {
  const completedBy = entry?.completed_by_name?.trim() || entry?.completed_by_email;

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg gap-4">
        <DialogHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-left leading-snug">{entry?.care_item_label}</DialogTitle>
              {entry?.care_item_category && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize mt-1.5">
                  {careCategoryLabel(entry.care_item_category)}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl bg-muted/25 border border-border/60 p-3 text-sm">
          {entry?.resource_name && (
            <div className="sm:col-span-2 flex items-center gap-1.5 text-muted-foreground min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {entry.resource_name}
                {entry.resource_type ? ` · ${entry.resource_type}` : ''}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{formatCareCompletedAt(entry?.completed_at)}</span>
          </div>
          {completedBy && (
            <UserIdentity
              name={entry?.completed_by_name}
              email={entry?.completed_by_email}
              avatarUrl={entry?.completed_by_avatar_url}
              className="text-muted-foreground min-w-0"
              labelClassName="text-sm text-muted-foreground"
            />
          )}
        </div>

        {entry?.notes?.trim() && (
          <p className="text-sm text-muted-foreground rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            {entry.notes.trim()}
          </p>
        )}

        {entry?.proof_image_url ? (
          <img
            src={entry.proof_image_url}
            alt="Care completion proof"
            className="w-full rounded-xl border border-border object-contain max-h-[60vh] bg-muted/20"
          />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed border-border">
            No proof image on file
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CareHistoryProofThumb({ entry, onClick, className }) {
  if (!entry?.proof_image_url) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        No proof
      </Badge>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-shadow shrink-0',
        className || 'w-16 h-11',
      )}
    >
      <img
        src={entry.proof_image_url}
        alt={`Proof for ${entry.care_item_label}`}
        className="w-full h-full object-cover"
      />
    </button>
  );
}

export function CareHistoryDateCell({ value }) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return <span>—</span>;
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm font-medium">{format(d, 'MMM d, yyyy')}</p>
      <p className="text-xs text-muted-foreground">{format(d, 'h:mm a')}</p>
    </div>
  );
}
