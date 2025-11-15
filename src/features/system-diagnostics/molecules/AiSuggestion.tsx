import React, { useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Button, ClipboardDocumentCheckIcon, CheckIcon } from '@components/atoms';

interface AiSuggestionProps {
    suggestion: { diagnosis: string; suggestion: string };
}

const AiSuggestion: React.FC<AiSuggestionProps> = ({ suggestion }) => {
    const { t } = useTranslation('system-diagnostics');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(suggestion.suggestion);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-3 ml-8 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border-l-4 border-blue-400 space-y-2">
            <div>
                <h5 className="text-sm font-bold text-blue-800 dark:text-blue-200">{t('diagnostics.ai_diagnosis', 'AIによる診断')}</h5>
                <p className="text-xs mt-1">{suggestion.diagnosis}</p>
            </div>
            <div>
                <div className="flex justify-between items-center">
                    <h5 className="text-sm font-bold text-blue-800 dark:text-blue-200">{t('diagnostics.suggestion_title', '修正依頼用の提案')}</h5>
                     <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <CheckIcon className="w-4 h-4 mr-1 text-green-600"/> : <ClipboardDocumentCheckIcon className="w-4 h-4 mr-1"/>}
                        {copied ? t('diagnostics.copied', 'コピーしました') : t('diagnostics.copy', 'コピー')}
                    </Button>
                </div>
                <div className="mt-1 p-2 bg-base-100 dark:bg-base-dark-200 rounded text-xs">
                    <p>{suggestion.suggestion}</p>
                </div>
            </div>
        </div>
    );
};

export default AiSuggestion;