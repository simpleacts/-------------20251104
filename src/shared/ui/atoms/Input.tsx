import React, { useId } from 'react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, id, name, ...props }, ref) => {
    // Generate unique id using React's useId hook
    const generatedId = useId();
    const inputId = id || (name ? `input-${name}-${generatedId}` : generatedId);
    const inputName = name || inputId;
    
    return (
      <input
        type={type}
        id={inputId}
        name={inputName}
        className={cn(
          'flex h-10 w-full rounded-md border border-default bg-input-bg dark:bg-input-bg-dark px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted dark:placeholder:text-muted-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };