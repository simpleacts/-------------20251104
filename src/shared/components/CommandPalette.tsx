

import React, { useEffect, useMemo, useRef, useState } from 'react';
// FIX: The Page type has been moved to a new location.
import { useNavigation } from '../../core/contexts/NavigationContext';
import { MagnifyingGlassIcon } from '../ui/atoms/icons';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    toolGroups: any[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    toolGroups,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLUListElement>(null);
    const { navigate } = useNavigation();

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const searchResults = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        if (!lowerSearch) return [];

        const results: any[] = [];
        
        const tools = toolGroups.flatMap(g => g.tools)
            .filter((t: any) => t.permission !== false && t.label.toLowerCase().includes(lowerSearch))
            .map((t: any) => ({ type: 'tool', ...t }));
        
        if (tools.length > 0) {
            results.push({ type: 'header', label: 'ツール' });
            results.push(...tools);
        }

        return results;
    }, [searchTerm, toolGroups]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchTerm]);

    useEffect(() => {
        const resultItem = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
        resultItem?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const handleItemClick = (item: any) => {
        if (item.type === 'tool') {
            navigate(item.page, undefined);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            let nextIndex = selectedIndex + 1;
            while(searchResults[nextIndex]?.type === 'header') {
                nextIndex++;
            }
            if (nextIndex < searchResults.length) {
                setSelectedIndex(nextIndex);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            let prevIndex = selectedIndex - 1;
            while(searchResults[prevIndex]?.type === 'header') {
                prevIndex--;
            }
            if (prevIndex >= 0) {
                setSelectedIndex(prevIndex);
            }
        } else if (e.key === 'Enter') {
            const item = searchResults[selectedIndex];
            if (item && item.type !== 'header') {
                handleItemClick(item);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start pt-20" onClick={onClose}>
            <div
                className="bg-base-100 dark:bg-base-dark-200 w-full max-w-xl rounded-lg shadow-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="command-palette-search"
            >
                <div className="relative">
                    <label htmlFor="command-palette-search" className="sr-only">ツールを検索</label>
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        id="command-palette-search"
                        name="command-palette-search"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="ツールを検索..."
                        className="w-full pl-12 pr-4 py-4 text-lg bg-transparent focus:outline-none"
                        aria-label="ツールを検索"
                    />
                </div>
                {searchTerm && (
                    <ul ref={resultsRef} className="border-t border-base-300 dark:border-base-dark-300 max-h-96 overflow-y-auto">
                        {searchResults.length > 0 ? (
                            searchResults.map((item, index) => {
                                if (item.type === 'header') {
                                    return (
                                        <li key={item.label} className="px-4 py-1.5 text-xs font-semibold text-gray-500 bg-base-200 dark:bg-base-dark-300">
                                            {item.label}
                                        </li>
                                    );
                                }
                                const isSelected = index === selectedIndex;
                                return (
                                    <li
                                        key={item.page}
                                        data-index={index}
                                        onClick={() => handleItemClick(item)}
                                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer ${isSelected ? 'bg-brand-secondary/20' : 'hover:bg-base-200 dark:hover:bg-base-dark-300/50'}`}
                                    >
                                        {item.icon || null}
                                        <span>{item.label}</span>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="p-6 text-center text-sm text-gray-500">一致する結果はありませんでした。</li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default CommandPalette;