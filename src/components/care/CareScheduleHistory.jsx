import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, isSameMonth } from 'date-fns';
import { resourceCareApi } from '@/api/resourceCare';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/EmptyState';
import {
  History, User, MapPin, CheckCircle2, ImageIcon, Calendar, StickyNote,
} from 'lucide-react';
import { careCategoryLabel, formatCareCompletedAt } from '@/lib/resourceCareUtils';
import { cn } from '@/lib/utils';
import CareHistoryProofDialog, { CareHistoryProofThumb, CareHistoryDateCell } from '@/components/care/CareHistoryProofDialog';

function HistoryStatPill({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
  };

  return (
    <div className="rounded-2xl border border-border bg-card flex items-center gap-3 px-4 py-3 min-w-0 w-full">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

function HistoryCard({ entry, onProofClick }) {
  const hasProof = Boolean(entry.proof_image_url);
  const completedBy = entry.completed_by_name?.trim() || entry.completed_by_email;
  const completedDate = entry.completed_at ? new Date(entry.completed_at) : null;
  const dateLabel = completedDate && !Number.isNaN(completedDate.getTime())
    ? format(completedDate, 'MMM d, yyyy')
    : '—';
  const timeLabel = completedDate && !Number.isNaN(completedDate.getTime())
    ? format(completedDate, 'h:mm a')
    : null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card border-l-4 border-l-success/60 overflow-hidden',
        'hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300',
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm leading-snug">{entry.care_item_label}</p>
                  {entry.care_item_category && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize shrink-0">
                      {careCategoryLabel(entry.care_item_category)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate font-medium text-foreground/90">{entry.resource_name}</span>
                  {entry.resource_type && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate shrink">{entry.resource_type}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs border-0 bg-success/10 text-success">
                Done
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-muted/25 border border-border/60 p-3">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
            <p className="text-xs font-medium text-foreground">{dateLabel}</p>
            {timeLabel && <p className="text-[11px] text-muted-foreground">{timeLabel}</p>}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Location</p>
            <p className="text-xs text-foreground truncate">{entry.resource_location || '—'}</p>
          </div>
          <div className="col-span-2 space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Completed by</p>
            <p className="text-xs text-foreground flex items-center gap-1.5">
              <User className="w-3 h-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{completedBy || '—'}</span>
            </p>
          </div>
        </div>

        {entry.notes?.trim() && (
          <div className="flex gap-2 rounded-lg bg-muted/20 border border-border/50 px-2.5 py-2">
            <StickyNote className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground line-clamp-3">{entry.notes.trim()}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 border-t border-border/60">
          {hasProof ? (
            <>
              <CareHistoryProofThumb
                entry={entry}
                onClick={() => onProofClick(entry)}
                className="w-20 h-14 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-shadow shrink-0"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-9 gap-1.5"
                onClick={() => onProofClick(entry)}
              >
                <ImageIcon className="w-4 h-4" />
                View proof
              </Button>
            </>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No proof image
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CareScheduleHistory({ filters }) {
  const [proofEntry, setProofEntry] = useState(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['care-history', filters],
    queryFn: () => resourceCareApi.listHistory(filters),
  });

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: history.length,
      thisMonth: history.filter(entry => {
        if (!entry.completed_at) return false;
        const d = new Date(entry.completed_at);
        return !Number.isNaN(d.getTime()) && isSameMonth(d, now);
      }).length,
      withProof: history.filter(entry => entry.proof_image_url).length,
    };
  }, [history]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No completion history"
        description="Completed care items with proof will appear here. Anyone with access to Care can view this log."
      />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4 sm:mb-6"
      >
        <HistoryStatPill icon={History} label="Total" value={stats.total} color="primary" />
        <HistoryStatPill icon={Calendar} label="This month" value={stats.thisMonth} color="success" />
        <HistoryStatPill icon={ImageIcon} label="With proof" value={stats.withProof} color="primary" />
      </motion.div>

      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
        {history.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.2) }}
          >
            <HistoryCard entry={entry} onProofClick={setProofEntry} />
          </motion.div>
        ))}
      </div>

      <Card className="hidden lg:block rounded-2xl border border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[min(36rem,calc(100dvh-16rem))] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Completed</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Resource</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Care item</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">By</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Notes</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm text-center">Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(entry => (
                  <TableRow key={entry.id} className="hover:bg-muted/20">
                    <TableCell>
                      <CareHistoryDateCell value={entry.completed_at} />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{entry.resource_name}</p>
                      <p className="text-xs text-muted-foreground">{entry.resource_type}</p>
                      {entry.resource_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{entry.resource_location}</span>
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{entry.care_item_label}</p>
                          {entry.care_item_category && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize mt-0.5">
                              {careCategoryLabel(entry.care_item_category)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px]">
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        {entry.completed_by_name?.trim() || entry.completed_by_email || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                      <span className="line-clamp-2">{entry.notes?.trim() || '—'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <CareHistoryProofThumb
                          entry={entry}
                          onClick={() => setProofEntry(entry)}
                          className="w-[4.5rem] h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-shadow shrink-0"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CareHistoryProofDialog entry={proofEntry} onClose={() => setProofEntry(null)} />
    </>
  );
}
