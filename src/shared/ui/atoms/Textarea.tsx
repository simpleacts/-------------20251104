import React, { useId } from 'react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, id, name, ...props }, ref) => {
    // Generate unique id using React's useId hook
    const generatedId = useId();
    const textareaId = id || (name ? `textarea-${name}-${generatedId}` : generatedId);
    const textareaName = name || textareaId;
    
    return (
      <textarea
        id={textareaId}
        name={textareaName}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-default bg-input-bg dark:bg-input-bg-dark px-3 py-2 text-sm ring-offset-background placeholder:text-muted dark:placeholder:text-muted-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };