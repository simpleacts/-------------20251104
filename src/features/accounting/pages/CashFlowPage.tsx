

import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database } from '@shared/types';
import CashFlowSummary from '../components/cash-flow/organisms/CashFlowSummary';

interface CashFlowToolProps {
    database: Partial<Database>;
}

const CashFlowTool: React.FC<CashFlowToolProps> = ({ database }) => {
    const { t } = useTranslation('accounting');
    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('accounting.cashflow.title', '資金繰り分析')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('accounting.cashflow.description', '月次のキャッシュフローを可視化し、経営判断をサポートします。')}</p>
            </header>
            <div className="flex-grow min-h-0">
                <CashFlowSummary database={database} />
            </div>
        </div>
    );
};

export default CashFlowTool;