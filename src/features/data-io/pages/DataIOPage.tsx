import React, { useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { PageHeader } from '@components/molecules';
import StockImporter from '../organisms/StockImporter';
import GenericImporter from '../organisms/GenericImporter';
import CsvExporter from '../organisms/CsvExporter';
import SqlExporter from '../organisms/SqlExporter';

const DataIO: React.FC = () => {
    const { t } = useTranslation('data-io');
    const [activeTab, setActiveTab] = useState('stock-import');

    const tabs = [
        { id: 'stock-import', label: t('data_io.tab_stock_import', '在庫CSVインポート') },
        { id: 'generic-import', label: t('data_io.tab_generic_import', '汎用CSVインポート') },
        { id: 'export-csv', label: t('data_io.tab_export_csv', 'CSVエクスポート') },
        { id: 'export-sql', label: t('data_io.tab_export_sql', 'SQLエクスポート') }
    ];

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'stock-import':
                return <StockImporter />;
            case 'generic-import':
                return <GenericImporter />;
            case 'export-csv':
                return <CsvExporter />;
            case 'export-sql':
                return <SqlExporter />;
            default:
                return null;
        }
    };

    return (
        <div>
            <PageHeader
                title={t('data_io.title', 'データ入出力')}
                description={t('data_io.description', '各種データのインポート、エクスポート、バックアップを行います。')}
            />

            <div className="border-b border-default mt-4 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-muted hover:text-base-content hover:border-gray-300 dark:hover:text-gray-300'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {renderActiveTab()}
            </div>
        </div>
    );
};

export default DataIO;
