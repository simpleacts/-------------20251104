import React from 'react';
import { SpinnerIcon } from './icons';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', centered = false, className, ...props }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <SpinnerIcon className={cn(sizeClasses[size], 'text-brand-primary', className)} {...props} />
      </div>
    );
  }

  return <SpinnerIcon className={cn(sizeClasses[size], 'text-brand-primary', className)} {...props} />;
};

export default Spinner;