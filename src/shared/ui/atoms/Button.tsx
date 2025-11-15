import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

// cva (class-variance-authority) のようなライブラリの簡易版ロジック
const getButtonClasses = (variant: ButtonVariant, size: ButtonSize, className?: string) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variantClasses: Record<ButtonVariant, string> = {
        primary: 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90',
        secondary: 'bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90',
        danger: 'bg-action-danger text-white hover:bg-action-danger-hover dark:bg-action-danger-dark dark:text-black dark:hover:bg-action-danger-hover-dark',
        ghost: 'hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-base dark:text-base-dark'
    };

    const sizeClasses: Record<ButtonSize, string> = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return [baseClasses, variantClasses[variant], sizeClasses[size], className].filter(Boolean).join(' ');
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={getButtonClasses(variant, size, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };