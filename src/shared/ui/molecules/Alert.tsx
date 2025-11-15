import React from 'react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const getVariantClasses = (variant: string) => {
  switch (variant as 'default' | 'destructive') {
    case 'destructive':
      return {
        base: 'border-status-danger-text/50 text-status-danger-text dark:border-status-danger-text [&>svg]:text-status-danger-text',
        title: 'text-status-danger-text dark:text-status-danger-text-dark',
        description: 'text-status-danger-text dark:text-status-danger-text-dark'
      };
    default:
      return {
        base: 'border-default text-base dark:text-base-dark [&>svg]:text-base',
        title: 'text-base dark:text-base-dark',
        description: 'text-muted dark:text-muted-dark'
      };
  }
};


const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = getVariantClasses(variant);
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
        variantClasses.base,
        className
      )}
      {...props}
    />
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };