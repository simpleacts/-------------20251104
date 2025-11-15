import React from 'react';
import { XMarkIcon } from '../atoms/icons';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
};

const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative z-50 w-full max-w-lg bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl max-h-[90vh] flex flex-col',
      className
    )}
    onClick={(e) => e.stopPropagation()}
    {...props}
  />
));
ModalContent.displayName = 'ModalContent';

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-4 border-b border-default', className)}
    {...props}
  />
));
ModalHeader.displayName = 'ModalHeader';

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t',
      className
    )}
    {...props}
  />
));
ModalFooter.displayName = 'ModalFooter';

const ModalTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-xl font-bold leading-none tracking-tight', className)}
    {...props}
  />
));
ModalTitle.displayName = 'ModalTitle';

const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted', className)} {...props} />
));
ModalDescription.displayName = 'ModalDescription';

const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 overflow-y-auto', className)} {...props} />
));
ModalBody.displayName = 'ModalBody';

const ModalCloseButton: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
        <XMarkIcon className="w-6 h-6" />
    </button>
);

export {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalCloseButton
};