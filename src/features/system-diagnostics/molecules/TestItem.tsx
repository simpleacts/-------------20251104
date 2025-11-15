import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Button, CheckIcon, ChevronDownIcon, SparklesIcon, SpinnerIcon, XMarkIcon } from '@components/atoms';

interface Test {
    id: string;
    name: string;
    description: string;
}

interface TestResult {
    status: 'pending' | 'running' | 'success' | 'failure';
    error?: string;
    isSuggestionLoading?: boolean;
}

interface TestItemProps {
    test: Test;
    result: TestResult | undefined;
    onGetSuggestion: () => void;
    children?: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
}

const TestItem: React.FC<TestItemProps> = ({ test, result, onGetSuggestion, children, isExpanded, onToggle }) => {
    const { t } = useTranslation('system-diagnostics');
    const status = result?.status || 'pending';

    const getStatusIcon = () => {
        switch (status) {
            case 'running': return <SpinnerIcon className="w-5 h-5 text-blue-500" />;
            case 'success': return <CheckIcon className="w-5 h-5 text-green-500" />;
            case 'failure': return <XMarkIcon className="w-5 h-5 text-red-500" />;
            default: return <div className="w-5 h-5" />;
        }
    };

    return (
        <div className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-lg border border-default dark:border-default-dark">
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{getStatusIcon()}</div>
                <button onClick={onToggle} className="flex-grow text-left flex justify-between items-center w-full">
                    <h4 className="font-semibold">{test.name}</h4>
                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {status === 'failure' && (
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onGetSuggestion(); }} disabled={result.isSuggestionLoading}>
                        {result.isSuggestionLoading ? <SpinnerIcon className="w-4 h-4 mr-1" /> : <SparklesIcon className="w-4 h-4 mr-1" />}
                        {t('diagnostics.ai_consult', 'AIに相談')}
                    </Button>
                )}
            </div>

            {isExpanded && (
                <div className="ml-8 mt-2 pt-2 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                    <div className="space-y-2">
                        <p className="text-xs text-muted dark:text-muted-dark">{test.description}</p>
                        {status === 'failure' && result?.error && (
                            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-md text-xs text-red-800 dark:text-red-200">
                                <h5 className="font-bold mb-1">{t('diagnostics.error_details', 'エラー詳細:')}</h5>
                                <pre className="whitespace-pre-wrap font-mono">{result.error}</pre>
                            </div>
                        )}
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestItem;
