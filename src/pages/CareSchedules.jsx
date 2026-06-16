import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { resourceCareApi } from '@/api/resourceCare';
import { db } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Wrench, Search, AlertTriangle, Clock, CheckCircle2, MapPin,
  Pencil, ShieldAlert, List, LayoutGrid, History,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { hasPermission } from '@/lib/permissions';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ResourceFormDialog from '@/components/resources/ResourceFormDialog';
import CareScheduleCalendar from '@/components/care/CareScheduleCalendar';
import CareScheduleHistory from '@/components/care/CareScheduleHistory';
import CompleteCareDialog from '@/components/care/CompleteCareDialog';
import {
  CARE_CATEGORIES, CARE_STATUS_META, formatCareDue, intervalTypeLabel, careCategoryLabel,
} from '@/lib/resourceCareUtils';
import { cn } from '@/lib/utils';

const VIEW_MODES = [
  { key: 'list', icon: List, label: 'List' },
  { key: 'calendar', icon: LayoutGrid, label: 'Calendar' },
  { key: 'history', icon: History, label: 'History' },
];

function StatPill({ icon: Icon, label, value, color = 'primary', active, onClick }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border bg-card min-w-0 w-full text-left transition-colors',
        'flex flex-col items-center justify-center gap-1.5 p-3',
        'sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4 sm:py-3',
        active ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40',
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-xl sm:text-lg font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 truncate">
          {label}
        </p>
      </div>
    </button>
  );
}

function careStatusAccent(status) {
  const map = {
    overdue: 'border-l-destructive',
    due: 'border-l-warning',
    upcoming: 'border-l-primary',
    ok: 'border-l-success/50',
    inactive: 'border-l-muted-foreground/25',
  };
  return map[status] || map.ok;
}

function careStatusIconBg(status) {
  const map = {
    overdue: 'bg-destructive/10 text-destructive',
    due: 'bg-warning/10 text-warning',
    upcoming: 'bg-primary/10 text-primary',
    ok: 'bg-success/10 text-success',
    inactive: 'bg-muted text-muted-foreground',
  };
  return map[status] || map.ok;
}


function ScheduleCard({ item, canManage, onComplete, onEditResource }) {
  const meta = CARE_STATUS_META[item.status] || CARE_STATUS_META.ok;
  const nextDueClass = cn(
    'text-xs font-medium',
    item.status === 'overdue' && 'text-destructive',
    item.status === 'due' && 'text-warning',
    item.status === 'upcoming' && 'text-primary',
  );

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card border-l-4 overflow-hidden',
        'hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300',
        careStatusAccent(item.status),
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              careStatusIconBg(item.status),
            )}
            >
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm leading-snug">{item.label}</p>
                {item.category && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize shrink-0">
                    {careCategoryLabel(item.category)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate font-medium text-foreground/90">{item.resource_name}</span>
                {item.resource_type && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate shrink">{item.resource_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-xs border-0', meta.className)}>
            {meta.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-muted/25 border border-border/60 p-3">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Location</p>
            <p className="text-xs text-foreground truncate">
              {item.resource_location || '—'}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Interval</p>
            <p className="text-xs text-foreground">{intervalTypeLabel(item.interval_type)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Next due</p>
            <p className={nextDueClass}>{formatCareDue(item)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Last done</p>
            <p className="text-xs text-muted-foreground">
              {item.last_done_at ? item.last_done_at.slice(0, 10) : '—'}
            </p>
          </div>
        </div>

        {item.block_when_overdue && (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/25 px-2.5 py-2 text-xs text-warning">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Blocks booking when overdue</span>
          </div>
        )}

        {canManage && (
          <div className="flex gap-2 pt-1 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-success border-success/30 hover:bg-success/10 hover:text-success"
              onClick={() => onComplete(item)}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Done
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onEditResource(item.resource_id)}
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              Resource
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CareSchedules() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editResource, setEditResource] = useState(null);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [completeItem, setCompleteItem] = useState(null);
  const [resourceFilter, setResourceFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => {
    const v = searchParams.get('view');
    if (v === 'calendar' || v === 'history') return v;
    return 'list';
  });

  const canManage = hasPermission(user, 'manage_resources');

  useEffect(() => {
    const q = searchParams.get('status');
    if (q) setStatusFilter(q);
    const v = searchParams.get('view');
    if (v === 'calendar' || v === 'history' || v === 'list') setViewMode(v);
  }, [searchParams]);

  const historyFilters = useMemo(() => ({
    resource_id: resourceFilter,
    resource_type: typeFilter,
    category: categoryFilter,
    search: search.trim() || undefined,
  }), [resourceFilter, typeFilter, categoryFilter, search]);

  const queryFilters = useMemo(() => ({
    status: statusFilter,
    resource_type: typeFilter,
    category: categoryFilter,
    search: search.trim() || undefined,
  }), [statusFilter, typeFilter, categoryFilter, search]);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['care-schedules', queryFilters],
    queryFn: () => resourceCareApi.listSchedules(queryFilters),
    enabled: viewMode !== 'history',
  });

  const { data: summary } = useQuery({
    queryKey: ['resource-care-summary'],
    queryFn: () => resourceCareApi.summary(),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const resourceTypes = useMemo(
    () => [...new Set(resources.map(r => r.resource_type).filter(Boolean))].sort(),
    [resources],
  );

  const counts = useMemo(() => ({
    all: summary?.total ?? 0,
    overdue: summary?.overdue ?? 0,
    due: summary?.due ?? 0,
    upcoming: summary?.upcoming ?? 0,
    ok: summary?.ok ?? 0,
  }), [summary]);

  const setStatus = (key) => {
    setStatusFilter(key);
    if (key === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', key);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const setView = (key) => {
    setViewMode(key);
    if (key === 'list') {
      searchParams.delete('view');
    } else {
      searchParams.set('view', key);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const openEditResource = (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource) {
      setEditResource(resource);
      setShowResourceForm(true);
    }
  };

  const openComplete = (item) => {
    setCompleteItem(item);
  };

  const completeResourceOdometer = useMemo(() => {
    if (!completeItem?.resource_id) return '';
    return resources.find(r => r.id === completeItem.resource_id)?.odometer_km ?? '';
  }, [completeItem, resources]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Wrench}
        title="Care schedules"
        description="All resource upkeep, compliance dates, and usage-based maintenance across your fleet and facilities"
      />

      <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3', viewMode === 'history' && 'hidden')}>
        <StatPill icon={Wrench} label="All items" value={counts.all} active={statusFilter === 'all'} onClick={() => setStatus('all')} />
        <StatPill icon={AlertTriangle} label="Overdue" value={counts.overdue} color="destructive" active={statusFilter === 'overdue'} onClick={() => setStatus('overdue')} />
        <StatPill icon={Clock} label="Due today" value={counts.due} color="warning" active={statusFilter === 'due'} onClick={() => setStatus('due')} />
        <StatPill icon={Clock} label="Upcoming" value={counts.upcoming} color="primary" active={statusFilter === 'upcoming'} onClick={() => setStatus('upcoming')} />
        <StatPill icon={CheckCircle2} label="OK" value={counts.ok} color="success" active={statusFilter === 'ok'} onClick={() => setStatus('ok')} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resource, item, type, location…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Resource type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {resourceTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CARE_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {viewMode === 'history' && (
          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resources</SelectItem>
              {[...resources]
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex rounded-lg border border-border p-0.5 shrink-0 self-start sm:self-auto">
          {VIEW_MODES.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              type="button"
              variant={viewMode === key ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('h-8 gap-1.5 px-3', viewMode === key && 'shadow-sm')}
              onClick={() => setView(key)}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {viewMode === 'history' ? (
        <CareScheduleHistory filters={historyFilters} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No care schedules found"
          description={statusFilter !== 'all' || search || typeFilter !== 'all' || categoryFilter !== 'all'
            ? 'Try adjusting your filters.'
            : 'Add care items on resources or apply type templates in Settings → Care.'}
        />
      ) : viewMode === 'calendar' ? (
        <CareScheduleCalendar
          schedules={schedules}
          resources={resources}
          canManage={canManage}
          onComplete={openComplete}
          onEditResource={openEditResource}
        />
      ) : (
        <>
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
            {schedules.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
              >
                <ScheduleCard
                  item={item}
                  canManage={canManage}
                  onComplete={openComplete}
                  onEditResource={openEditResource}
                />
              </motion.div>
            ))}
          </div>

          <Card className="hidden lg:block rounded-2xl border border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[min(36rem,calc(100dvh-16rem))] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 bg-card">Item</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card">Resource</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card">Schedule</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card">Last done</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card">Next / usage</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card">Status</TableHead>
                      {canManage && (
                        <TableHead className="sticky top-0 z-10 bg-card text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map(item => {
                      const meta = CARE_STATUS_META[item.status] || CARE_STATUS_META.ok;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{item.resource_name}</p>
                            <p className="text-xs text-muted-foreground">{item.resource_type}</p>
                            {item.resource_location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.resource_location}</span>
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {intervalTypeLabel(item.interval_type)}
                            {item.block_when_overdue && (
                              <Badge variant="outline" className="ml-2 text-xs text-warning border-warning/30">Blocks</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {item.last_done_at ? item.last_done_at.slice(0, 10) : '—'}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatCareDue(item)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs', meta.className)}>
                              {meta.label}
                            </Badge>
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => openComplete(item)}>
                                  Done
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => openEditResource(item.resource_id)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <CompleteCareDialog
        item={completeItem}
        resourceOdometer={completeResourceOdometer}
        open={!!completeItem}
        onClose={() => setCompleteItem(null)}
      />

      <ResourceFormDialog
        open={showResourceForm}
        onClose={() => { setShowResourceForm(false); setEditResource(null); }}
        resource={editResource}
        user={user}
      />
    </div>
  );
}
