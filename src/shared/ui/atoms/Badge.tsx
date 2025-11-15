import React from 'react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const getVariantClasses = (variant: 'default' | 'secondary' | 'destructive' | 'outline') => {
  switch (variant) {
    case 'secondary':
      return 'border-transparent bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-80';
    case 'destructive':
      return 'border-transparent bg-status-danger-bg text-status-danger-text dark:bg-status-danger-bg-dark dark:text-status-danger-text-dark';
    case 'outline':
      return 'text-base dark:text-base-dark border-default';
    default:
      return 'border-transparent bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark';
  }
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        getVariantClasses(variant),
        className
      )}
      {...props}
    />
  );
}

export { Badge };