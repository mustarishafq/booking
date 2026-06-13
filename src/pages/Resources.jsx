import { db } from '@/api/base44Client';

import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { Plus, Search, LayoutGrid, List, LayoutList, Boxes, CheckCircle2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceFormDialog from '@/components/resources/ResourceFormDialog';
import { hasPermission } from '@/lib/permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

const VIEW_MODES = [
  { key: 'grid', icon: LayoutGrid, label: 'Grid' },
  { key: 'list', icon: List, label: 'List' },
  { key: 'compact', icon: LayoutList, label: 'Compact' },
];

const VIEW_STORAGE_KEY = 'resources-view';

function readStoredViewMode() {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEW_MODES.some(v => v.key === stored) ? stored : 'grid';
  } catch {
    return 'grid';
  }
}

function StatPill({ icon: Icon, label, value, color = 'primary', className }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    accent: 'bg-accent/10 text-accent-foreground',
  };

  return (
    <div className={cn('rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3 min-w-0', className)}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function Resources() {
  const { user, openBookingModal } = useOutletContext();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState(readStoredViewMode);
  const [showForm, setShowForm] = useState(false);
  const [editResource, setEditResource] = useState(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const resourceTypes = useMemo(
    () => [...new Set(resources.map(r => r.resource_type).filter(Boolean))].sort(),
    [resources],
  );

  const typeCounts = useMemo(() => {
    const counts = {};
    resources.forEach(r => {
      if (r.resource_type) counts[r.resource_type] = (counts[r.resource_type] || 0) + 1;
    });
    return counts;
  }, [resources]);

  const activeCount = useMemo(
    () => resources.filter(r => r.status === 'active').length,
    [resources],
  );

  const filtered = useMemo(() => resources.filter(r => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.resource_type?.toLowerCase().includes(search.toLowerCase()) ||
      r.location?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || r.resource_type === typeFilter;
    return matchSearch && matchType;
  }), [resources, search, typeFilter]);

  const hasActiveFilters = search.trim() !== '' || typeFilter !== 'all';

  const openEdit = (r) => { setEditResource(r); setShowForm(true); };
  const openCreate = () => { setEditResource(null); setShowForm(true); };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
  };

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore storage errors */
    }
  }, [viewMode]);

  const isAdmin = user?.role === 'admin';
  const isInternal = user?.user_type === 'internal';
  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  const gridClass = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutGrid}
        title="Resources"
        description="Browse and manage all bookable resources"
        actions={
          hasPermission(user, 'manage_resources') ? (
            <Button onClick={openCreate} className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30">
              <Plus className="w-4 h-4" />
              Add Resource
            </Button>
          ) : null
        }
      />

      {!isLoading && resources.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatPill icon={Boxes} label="Total" value={resources.length} color="primary" />
          <StatPill icon={CheckCircle2} label="Active" value={activeCount} color="success" />
          <StatPill icon={Tag} label="Types" value={resourceTypes.length} color="accent" className="col-span-2 lg:col-span-1" />
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by name, type, or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {resourceTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                typeFilter === 'all'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              All
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                typeFilter === 'all' ? 'bg-primary-foreground/20' : 'bg-muted',
              )}
              >
                {resources.length}
              </span>
            </button>
            {resourceTypes.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  typeFilter === t
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {t}
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  typeFilter === t ? 'bg-primary-foreground/20' : 'bg-muted',
                )}
                >
                  {typeCounts[t] || 0}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!isLoading && (
            <div className="flex items-center gap-2 flex-wrap min-h-8">
              <p className="text-sm text-muted-foreground">
                {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
                {typeFilter !== 'all' ? ` in ${typeFilter}` : ''}
              </p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={clearFilters}>
                  <X className="w-3 h-3" />
                  Clear filters
                </Button>
              )}
            </div>
          )}

          <div className="hidden md:inline-flex h-9 w-auto items-center rounded-lg bg-muted p-1">
            {VIEW_MODES.map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-3 rounded-md gap-1.5',
                  viewMode === key && 'bg-background shadow text-foreground',
                )}
                onClick={() => setViewMode(key)}
                aria-pressed={viewMode === key}
                aria-label={label}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={effectiveViewMode === 'grid' ? gridClass : 'space-y-3'}>
          {Array.from({ length: effectiveViewMode === 'grid' ? 6 : 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className={effectiveViewMode === 'grid' ? 'h-72 rounded-2xl' : effectiveViewMode === 'list' ? 'h-32 md:h-28 rounded-2xl' : 'h-16 rounded-xl'}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No resources found"
          description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'No resources have been added yet.'}
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
            ) : hasPermission(user, 'manage_resources') ? (
              <Button size="sm" onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Resource
              </Button>
            ) : null
          }
        />
      ) : effectiveViewMode === 'grid' ? (
        <motion.div
          className={gridClass}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
          }}
        >
          {filtered.map(r => (
            <motion.div
              key={r.id}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            >
              <ResourceCard
                resource={r}
                isAdmin={isAdmin}
                isInternal={isInternal}
                onEdit={() => openEdit(r)}
                onBook={openBookingModal}
                view="grid"
              />
            </motion.div>
          ))}
        </motion.div>
      ) : effectiveViewMode === 'list' ? (
        <div className="space-y-3">
          {filtered.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              isAdmin={isAdmin}
              isInternal={isInternal}
              onEdit={() => openEdit(r)}
              onBook={openBookingModal}
              view="list"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border bg-card">
          {filtered.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              isAdmin={isAdmin}
              isInternal={isInternal}
              onEdit={() => openEdit(r)}
              onBook={openBookingModal}
              view="compact"
            />
          ))}
        </div>
      )}

      <ResourceFormDialog open={showForm} onClose={() => setShowForm(false)} resource={editResource} user={user} />
    </div>
  );
}
