import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { hasPermission } from '@/lib/permissions';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

const typeLabels = {
  credit_purchase: { label: 'Credit Purchase', color: 'bg-success/10 text-success border-success/30' },
  booking_charge: { label: 'Booking Charge', color: 'bg-primary/10 text-primary border-primary/30' },
  refund: { label: 'Refund', color: 'bg-warning/10 text-warning border-warning/30' },
  admin_adjustment: { label: 'Adjustment', color: 'bg-secondary text-secondary-foreground' },
};

export default function Transactions() {
  const { user } = useOutletContext();
  const [typeFilter, setTypeFilter] = useState('all');

  const canViewAll = hasPermission(user, 'view_all_transactions');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list('-created_date', 100),
  });

  if (user?.user_type === 'internal') return <Navigate to="/" replace />;

  const filtered = transactions
    .filter(t => canViewAll || t.user_email === user?.email)
    .filter(t => typeFilter === 'all' || t.type === typeFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Transactions"
        description={canViewAll ? 'All credit activity across the system' : 'Your credit history'}
        actions={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(typeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions found" />
      ) : (
        <Card className="rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const isPositive = (t.amount_cents || 0) > 0;
                  const typeInfo = typeLabels[t.type] || { label: t.type, color: '' };
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{t.description}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          RM{(Math.abs(t.amount_cents || 0) / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        RM{((t.balance_after_cents || 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {t.created_at ? format(new Date(t.created_at), 'MMM d, h:mm a') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}