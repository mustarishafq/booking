import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const pickerIndicatorClass = cn(
  'relative pr-10',
  '[&::-webkit-calendar-picker-indicator]:absolute',
  '[&::-webkit-calendar-picker-indicator]:right-2.5',
  '[&::-webkit-calendar-picker-indicator]:top-1/2',
  '[&::-webkit-calendar-picker-indicator]:-translate-y-1/2',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
  '[&::-webkit-calendar-picker-indicator]:opacity-80',
  '[&::-webkit-calendar-picker-indicator]:h-4',
  '[&::-webkit-calendar-picker-indicator]:w-4',
  'dark:[&::-webkit-calendar-picker-indicator]:invert',
);

const DateInput = React.forwardRef(({ className, ...props }, ref) => (
  <Input
    type="date"
    ref={ref}
    className={cn(pickerIndicatorClass, className)}
    {...props}
  />
));
DateInput.displayName = 'DateInput';

const DateTimeInput = React.forwardRef(({ className, ...props }, ref) => (
  <Input
    type="datetime-local"
    ref={ref}
    className={cn(
      pickerIndicatorClass,
      'min-w-0 text-[13px] sm:text-sm',
      className,
    )}
    {...props}
  />
));
DateTimeInput.displayName = 'DateTimeInput';

export { DateInput, DateTimeInput };
