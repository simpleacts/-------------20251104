import React, { useRef } from 'react';
import { ChevronDownIcon } from './icons';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// Counter for generating unique IDs when id/name are not provided
let selectIdCounter = 0;

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, id, name, ...props }, ref) => {
  // Generate id and name if not provided
  const idRef = useRef<string | null>(null);
  if (!idRef.current) {
    idRef.current = id || (name ? `select-${name}` : `select-${++selectIdCounter}`);
  }
  const selectId = id || idRef.current;
  const selectName = name || selectId;
  
  return (
    <div className="relative">
      <select
        id={selectId}
        name={selectName}
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-default bg-input-bg dark:bg-base-dark-300 dark:text-white px-3 py-2 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
    </div>
  );
});
Select.displayName = 'Select';

export { Select };