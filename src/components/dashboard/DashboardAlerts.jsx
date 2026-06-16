import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ALERT_STYLES = {
  warning: {
    border: 'border-warning/30',
    bg: 'bg-warning/10 hover:bg-warning/15',
    text: 'text-warning',
    Icon: AlertTriangle,
  },
  destructive: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/10 hover:bg-destructive/15',
    text: 'text-destructive',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-primary/30',
    bg: 'bg-primary/10 hover:bg-primary/15',
    text: 'text-primary',
    Icon: Info,
  },
};

export default function DashboardAlerts({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => {
        const style = ALERT_STYLES[alert.type] || ALERT_STYLES.warning;
        const Icon = style.Icon;
        return (
        <motion.div
          key={alert.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            to={alert.href}
            className={cn(
              'flex items-start sm:items-center gap-3 px-3.5 py-3 sm:px-4 rounded-xl border transition-colors',
              style.border,
              style.bg,
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0 mt-0.5 sm:mt-0', style.text)} />
            <span className="text-sm font-medium text-foreground flex-1 min-w-0 leading-snug">
              {alert.message}
            </span>
            <span className={cn('hidden sm:inline shrink-0 text-xs font-medium whitespace-nowrap', style.text)}>
              Review →
            </span>
            <ChevronRight className={cn('w-4 h-4 shrink-0 sm:hidden', style.text)} aria-hidden />
          </Link>
        </motion.div>
        );
      })}
    </div>
  );
}
