import React from 'react';
import { ChevronDownIcon } from './icons';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string;
    onValueChange?: (value: string) => void;
    name?: string;
}

// Recursive function to find and inject props into RadioGroupItemWrapper
// FIX: Correctly type `child` using `isValidElement` with a generic prop type.
// This resolves errors related to accessing `value` and `children` on `child.props`,
// and allows cloning with additional props (`name`, `checked`, `onChange`) due to the index signature.
function cloneChildrenWithProps(children: React.ReactNode, name?: string, selectedValue?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void): React.ReactNode {
    return React.Children.map(children, child => {
        if (!React.isValidElement<{ value?: string; children?: React.ReactNode; [key: string]: any }>(child)) {
            return child;
        }

        // If this is the wrapper we're looking for, clone it with the necessary props.
        if ((child.type as any).displayName === 'RadioGroupItemWrapper') {
            return React.cloneElement(child, {
                name: name,
                checked: child.props.value === selectedValue,
                onChange: onChange,
            });
        }

        // If the child has its own children, recurse.
        if (child.props.children) {
            return React.cloneElement(child, {
                children: cloneChildrenWithProps(child.props.children, name, selectedValue, onChange)
            });
        }
        
        return child;
    });
}

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  RadioGroupProps
>(({ className, children, value, onValueChange, name, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onValueChange?.(e.target.value);
    return (
        <div
            ref={ref}
            className={cn('grid gap-2', className)}
            role="radiogroup"
            {...props}
        >
            {cloneChildrenWithProps(children, name, value, handleChange)}
        </div>
    );
});
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <div className="relative flex items-center">
        <input
            type="radio"
            ref={ref}
            className={cn(
                'peer h-4 w-4 shrink-0 appearance-none rounded-full border border-default ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-50',
                'checked:border-brand-primary dark:checked:border-brand-secondary',
                className
            )}
            {...props}
        />
        <div className="absolute h-2.5 w-2.5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent peer-checked:bg-brand-primary dark:peer-checked:bg-brand-secondary pointer-events-none" />
    </div>
  );
});
RadioGroupItem.displayName = 'RadioGroupItem';

const RadioGroupItemWrapper = ({ children, ...props }: React.PropsWithChildren<any>) => {
    const childElements = React.Children.toArray(children);
    // FIX: Add a generic type parameter to React.isValidElement to correctly type-check child props and resolve multiple overload errors.
    const radioItem = childElements.find(child => React.isValidElement<any>(child) && child.type === RadioGroupItem);
    const otherChildren = childElements.filter(child => child !== radioItem);

    if (radioItem && React.isValidElement(radioItem)) {
        return (
            <>
                {React.cloneElement(radioItem as React.ReactElement<any>, Object.assign({}, radioItem.props, props))}
                {otherChildren}
            </>
        );
    }
    return <>{children}</>;
};
RadioGroupItemWrapper.displayName = 'RadioGroupItemWrapper';


export { RadioGroup, RadioGroupItem, RadioGroupItemWrapper };