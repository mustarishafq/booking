import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DateInput = React.forwardRef(({ className, ...props }, ref) => (
  <Input
    type="date"
    ref={ref}
    className={cn(
      'relative pr-10',
      '[&::-webkit-calendar-picker-indicator]:absolute',
      '[&::-webkit-calendar-picker-indicator]:right-3',
      '[&::-webkit-calendar-picker-indicator]:top-1/2',
      '[&::-webkit-calendar-picker-indicator]:-translate-y-1/2',
      '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
      '[&::-webkit-calendar-picker-indicator]:opacity-80',
      className,
    )}
    {...props}
  />
));
DateInput.displayName = 'DateInput';

export { DateInput };
