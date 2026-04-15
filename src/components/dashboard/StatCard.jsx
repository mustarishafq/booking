import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </Card>
  );
}