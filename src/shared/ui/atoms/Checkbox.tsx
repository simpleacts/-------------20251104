import React from 'react';
import { CheckIcon } from './icons';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<
  HTMLInputElement,
  CheckboxProps
>(({ className, onCheckedChange, onChange, ...props }, ref) => {
  return (
    <div className="relative flex items-center">
        <input
            type="checkbox"
            ref={ref}
            className={cn(
                'peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-default ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-50',
                'checked:bg-brand-primary checked:text-white dark:checked:bg-brand-secondary',
                className
            )}
            onChange={(e) => {
                onChange?.(e);
                onCheckedChange?.(e.target.checked);
            }}
            {...props}
        />
        <CheckIcon className="absolute h-4 w-4 left-0 top-0 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
    </div>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };