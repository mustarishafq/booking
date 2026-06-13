import { cn } from '@/lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('text-center py-16', className)}>
      {Icon && <Icon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />}
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
