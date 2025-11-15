import React from 'react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: 'horizontal' | 'vertical';
  }
>(
  (
    { className, orientation = 'horizontal', ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        'shrink-0 bg-default dark:bg-default',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      role="separator"
      aria-orientation={orientation}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export { Separator };