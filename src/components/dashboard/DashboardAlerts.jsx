import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardAlerts({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <motion.div
          key={alert.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            to={alert.href}
            className="flex items-start sm:items-center gap-3 px-3.5 py-3 sm:px-4 rounded-xl border border-warning/30 bg-warning/10 hover:bg-warning/15 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5 sm:mt-0" />
            <span className="text-sm font-medium text-foreground flex-1 min-w-0 leading-snug">
              {alert.message}
            </span>
            <span className="hidden sm:inline shrink-0 text-xs font-medium text-warning whitespace-nowrap">
              Review →
            </span>
            <ChevronRight className="w-4 h-4 text-warning shrink-0 sm:hidden" aria-hidden />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
