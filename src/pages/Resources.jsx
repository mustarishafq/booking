import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Plus, Search, LayoutGrid, List, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceFormDialog from '@/components/resources/ResourceFormDialog';
import { hasPermission } from '@/lib/permissions';

const VIEW_MODES = [
  { key: 'grid',    icon: LayoutGrid,  label: 'Grid' },
  { key: 'list',    icon: List,        label: 'List' },
  { key: 'compact', icon: LayoutList,  label: 'Compact' },
];

export default function Resources() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showForm, setShowForm] = useState(false);
  const [editResource, setEditResource] = useState(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const resourceTypes = [...new Set(resources.map(r => r.resource_type).filter(Boolean))];

  const filtered = resources.filter(r => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.resource_type?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || r.resource_type === typeFilter;
    return matchSearch && matchType;
  });

  const openEdit = (r) => { setEditResource(r); setShowForm(true); };
  const openCreate = () => { setEditResource(null); setShowForm(true); };

  const isAdmin = user?.role === 'admin';
  const isInternal = user?.user_type === 'internal';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="text-muted-foreground mt-1">Browse and manage all bookable resources</p>
        </div>
        {hasPermission(user, 'manage_resources') && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Resource
          </Button>
        )}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {resourceTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* View mode toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden h-10 flex-shrink-0">
          {VIEW_MODES.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              title={label}
              onClick={() => setViewMode(key)}
              className={`flex items-center justify-center w-10 h-full transition-colors ${viewMode === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground -mt-2">
          {filtered.length} resource{filtered.length !== 1 ? 's' : ''}{typeFilter !== 'all' ? ` in ${typeFilter}` : ''}
        </p>
      )}

      {/* Resource list */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {[1, 2, 3].map(i => <Skeleton key={i} className={viewMode === 'grid' ? 'h-72 rounded-xl' : 'h-20 rounded-xl'} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No resources found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} isAdmin={isAdmin} isInternal={isInternal} onEdit={() => openEdit(r)} view="grid" />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} isAdmin={isAdmin} isInternal={isInternal} onEdit={() => openEdit(r)} view="list" />
          ))}
        </div>
      ) : (
        /* Compact table-like view */
        <div className="border rounded-xl overflow-hidden divide-y">
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} isAdmin={isAdmin} isInternal={isInternal} onEdit={() => openEdit(r)} view="compact" />
          ))}
        </div>
      )}

      <ResourceFormDialog open={showForm} onClose={() => setShowForm(false)} resource={editResource} />
    </div>
  );
}