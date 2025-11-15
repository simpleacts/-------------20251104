import React from 'react';
import { MagnifyingGlassIcon } from '../atoms/icons';

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, id, name, ...props }, ref) => {
    const inputId = id || name || `search-input-${Math.random().toString(36).substring(2, 9)}`;
    const inputName = name || inputId;
    
    return (
      <div className="relative w-full">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="search"
          id={inputId}
          name={inputName}
          ref={ref}
          className={`w-full pl-10 pr-4 py-2 bg-input-bg dark:bg-input-bg-dark border border-default rounded-md text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none ${className || ''}`}
          {...props}
        />
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

export default SearchInput;