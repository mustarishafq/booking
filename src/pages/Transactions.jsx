import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const typeLabels = {
  credit_purchase: { label: 'Credit Purchase', color: 'bg-emerald-500/10 text-emerald-600' },
  booking_charge: { label: 'Booking Charge', color: 'bg-primary/10 text-primary' },
  refund: { label: 'Refund', color: 'bg-amber-500/10 text-amber-600' },
  admin_adjustment: { label: 'Adjustment', color: 'bg-secondary text-secondary-foreground' },
};

export default function Transactions() {
  const { user } = useOutletContext();
  const [typeFilter, setTypeFilter] = useState('all');
  const isAdmin = user?.role === 'admin';

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list('-created_date', 100),
  });

  const filtered = transactions
    .filter(t => isAdmin || t.user_email === user?.email)
    .filter(t => typeFilter === 'all' || t.type === typeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">Your credit history</p>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No transactions found</p>
        </div>
      ) : (
        <Card>
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
                        <div className={`flex items-center gap-1 font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
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