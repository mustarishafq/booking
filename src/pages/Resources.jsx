import { db } from '@/api/base44Client';

import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { Plus, Search, Boxes, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceFormDialog from '@/components/resources/ResourceFormDialog';
import { hasPermission } from '@/lib/permissions';
import { getResourceTypeIcon, buildResourceBookingCounts } from '@/lib/resourceVisuals';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'maintenance', label: 'Care' },
  { key: 'inactive', label: 'Inactive' },
];

const GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';

function TypeChip({ active, label, count, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25'
          : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
      {label}
      <span
        className={cn(
          'text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
          active ? 'bg-primary-foreground/20' : 'bg-muted',
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default function Resources() {
  const { user, openBookingModal } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editResource, setEditResource] = useState(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'resource-exp'],
    queryFn: () => db.entities.Booking.list('-start_time', 10000),
  });

  const bookingCounts = useMemo(
    () => buildResourceBookingCounts(bookings),
    [bookings],
  );

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

  const statusCounts = useMemo(() => {
    const counts = { all: resources.length, active: 0, maintenance: 0, inactive: 0 };
    resources.forEach(r => {
      if (counts[r.status] != null) counts[r.status] += 1;
    });
    return counts;
  }, [resources]);

  const filtered = useMemo(() => {
    const STATUS_ORDER = { active: 0, maintenance: 1, inactive: 2 };
    return resources
      .filter(r => {
        const q = search.toLowerCase().trim();
        const matchSearch = !q
          || r.name?.toLowerCase().includes(q)
          || r.resource_type?.toLowerCase().includes(q)
          || r.location?.toLowerCase().includes(q)
          || r.pic_name?.toLowerCase().includes(q);
        const matchType = typeFilter === 'all' || r.resource_type === typeFilter;
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchSearch && matchType && matchStatus;
      })
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1));
  }, [resources, search, typeFilter, statusFilter]);

  const hasActiveFilters = search.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'active';
  const canManage = hasPermission(user, 'manage_resources');
  const isAdmin = user?.role === 'admin';
  const isInternal = user?.user_type === 'internal';

  const openEdit = (r) => { setEditResource(r); setShowForm(true); };
  const openCreate = () => { setEditResource(null); setShowForm(true); };
  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('active');
  };

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Boxes className="w-5 h-5" />
            </span>
            Resources
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 ml-[3.25rem]">
            {isLoading
              ? 'Loading catalog…'
              : `${filtered.length} resource${filtered.length !== 1 ? 's' : ''}${typeFilter !== 'all' ? ` · ${typeFilter}` : ''}`}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2 shadow-md shadow-primary/20 shrink-0">
            <Plus className="w-4 h-4" />
            Add Resource
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-10"
              placeholder="Search name, type, location, or PIC…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-muted p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  statusFilter === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                <span className="ml-1 tabular-nums opacity-60">{statusCounts[key] ?? 0}</span>
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 shrink-0" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </div>

        {resourceTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TypeChip
              active={typeFilter === 'all'}
              label="All"
              count={resources.length}
              icon={Boxes}
              onClick={() => setTypeFilter('all')}
            />
            {resourceTypes.map(t => (
              <TypeChip
                key={t}
                active={typeFilter === t}
                label={t}
                count={typeCounts[t] || 0}
                icon={getResourceTypeIcon(t)}
                onClick={() => setTypeFilter(t)}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[22rem] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No resources found"
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'No resources have been added yet.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
            ) : canManage ? (
              <Button size="sm" onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Resource
              </Button>
            ) : null
          }
        />
      ) : (
        <motion.div
          className={GRID_CLASS}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
          }}
        >
          {filtered.map(r => (
            <motion.div
              key={r.id}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="min-w-0"
            >
              <ResourceCard
                resource={r}
                isAdmin={isAdmin}
                isInternal={isInternal}
                bookingCount={bookingCounts[r.id] || 0}
                onEdit={() => openEdit(r)}
                onBook={openBookingModal}
                view="grid"
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <ResourceFormDialog open={showForm} onClose={() => setShowForm(false)} resource={editResource} user={user} />
    </div>
  );
}
