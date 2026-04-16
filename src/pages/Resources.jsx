import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceFormDialog from '@/components/resources/ResourceFormDialog';
import { hasPermission } from '@/lib/permissions';

export default function Resources() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
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

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {resourceTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No resources found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              isAdmin={user?.role === 'admin'}
              isInternal={user?.user_type === 'internal'}
              onEdit={() => openEdit(r)}
            />
          ))}
        </div>
      )}

      <ResourceFormDialog open={showForm} onClose={() => setShowForm(false)} resource={editResource} />
    </div>
  );
}