import React from 'react';
import { motion } from 'framer-motion';
import { statColorMap } from '@/lib/bookingUtils';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary', index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'bg-card rounded-2xl border border-border min-w-0',
        'p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300',
      )}
    >
      <div className="flex items-center gap-3 sm:items-start sm:justify-between">
        {Icon && (
          <div
            className={cn(
              'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0',
              'sm:order-2',
              statColorMap[color] || statColorMap.primary,
            )}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none">{value}</p>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {trend != null && (
        <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 pl-12 sm:pl-0">
          <span className={`text-xs font-medium ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}
