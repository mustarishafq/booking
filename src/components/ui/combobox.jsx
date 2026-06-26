import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PopoverContent } from '@/components/ui/popover';

const ComboboxTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="combobox"
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm',
      'ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring',
      'data-[state=open]:ring-1 data-[state=open]:ring-ring',
      'font-normal text-left',
      className,
    )}
    {...props}
  >
    <span className="min-w-0 flex-1 truncate">{children}</span>
    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground opacity-70" />
  </button>
));
ComboboxTrigger.displayName = 'ComboboxTrigger';

const ComboboxContent = React.forwardRef(({ className, ...props }, ref) => (
  <PopoverContent
    ref={ref}
    align="start"
    className={cn('z-[100] w-[var(--radix-popover-trigger-width)] p-0', className)}
    {...props}
  />
));
ComboboxContent.displayName = 'ComboboxContent';

export { ComboboxTrigger, ComboboxContent };
