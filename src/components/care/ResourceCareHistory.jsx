import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resourceCareApi } from '@/api/resourceCare';
import { Button } from '@/components/ui/button';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { History, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCareCompletedAt } from '@/lib/resourceCareUtils';
import { UserIdentity } from '@/components/UserAvatar';
import CareHistoryProofDialog, { CareHistoryProofThumb } from '@/components/care/CareHistoryProofDialog';

export default function ResourceCareHistory({ resourceId }) {
  const [open, setOpen] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['resource-care-history', resourceId],
    queryFn: () => resourceCareApi.listHistory({ resource_id: resourceId }),
    enabled: !!resourceId && open,
  });

  if (!resourceId) return null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border pt-4">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between h-auto py-2 px-0 hover:bg-transparent"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <History className="w-4 h-4" />
              Completion history
            </span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-2">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center">
              No completions recorded yet. Mark a care item as done with proof to build history.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {history.map(entry => (
                <div key={entry.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.care_item_label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{entry.care_item_category}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatCareCompletedAt(entry.completed_at)}
                    </p>
                  </div>

                  {(entry.completed_by_name || entry.completed_by_email) && (
                    <UserIdentity
                      name={entry.completed_by_name}
                      email={entry.completed_by_email}
                      avatarUrl={entry.completed_by_avatar_url}
                      className="text-xs text-muted-foreground"
                      labelClassName="text-xs text-muted-foreground"
                    />
                  )}

                  {entry.usage_reading != null && (
                    <p className="text-xs text-muted-foreground">
                      Reading: {entry.usage_reading}
                      {entry.next_due_at ? ` · Next due ${entry.next_due_at.slice(0, 10)}` : ''}
                    </p>
                  )}

                  {entry.notes?.trim() && (
                    <p className="text-xs text-muted-foreground">{entry.notes}</p>
                  )}

                  <CareHistoryProofThumb
                    entry={entry}
                    onClick={() => setProofPreview(entry)}
                    className="block w-full max-w-[140px] rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-shadow"
                  />
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <CareHistoryProofDialog entry={proofPreview} onClose={() => setProofPreview(null)} />
    </>
  );
}
