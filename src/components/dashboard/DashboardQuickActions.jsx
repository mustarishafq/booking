import { Link } from 'react-router-dom';
import {
  Plus, LayoutGrid, CalendarDays, Clock, Users, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ICONS = { Plus, LayoutGrid, CalendarDays, Clock, Users, Settings };

export default function DashboardQuickActions({ actions }) {
  if (!actions?.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-3 sm:p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-0.5">
        Quick actions
      </p>
      <div
        className={cn(
          'grid grid-cols-2 gap-2',
          'sm:flex sm:flex-wrap sm:gap-2',
        )}
      >
        {actions.map((action, index) => {
          const Icon = ICONS[action.icon];
          const buttonClass = cn(
            'gap-2 rounded-xl w-full sm:w-auto',
            action.primary && 'col-span-2 sm:col-span-1',
          );

          const buttonProps = {
            variant: action.primary ? 'default' : 'outline',
            size: 'sm',
            className: buttonClass,
          };

          const content = (
            <>
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span className="truncate">{action.label}</span>
            </>
          );

          return (
            <motion.div
              key={action.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              className="min-w-0"
            >
              {action.onClick ? (
                <Button {...buttonProps} onClick={action.onClick}>
                  {content}
                </Button>
              ) : (
                <Button {...buttonProps} asChild>
                  <Link to={action.href}>{content}</Link>
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
