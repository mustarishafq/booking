import { cn } from '@/lib/utils';

export const glassDockStyles = cn(
  'backdrop-blur-2xl bg-card/30 border-border/50 shadow rounded-2xl border',
  'dark:bg-card/35 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
);

export const glassPanelStyles = cn(
  'backdrop-blur-xl bg-card/80 border-border/50',
  'dark:bg-card/35'
);
