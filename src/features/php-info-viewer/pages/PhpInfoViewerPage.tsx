import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon, Input } from '@components/atoms';
import { PageHeader } from '@components/molecules';

interface PhpInfo {
    php_version: string;
    ini_settings: Record<string, { global_value: string, local_value: string, access: number }>;
    phpinfo_html: string;
}

const PhpInfoViewer: React.FC = () => {
    const { t } = useTranslation('php-info-viewer');
    const [phpInfo, setPhpInfo] = useState<PhpInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const fetchPhpInfo = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/get-php-info.php');
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }
                setPhpInfo(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : t('php_info.fetch_error', 'PHP情報の取得に失敗しました。'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchPhpInfo();
    }, []);

    const filteredSettings = useMemo(() => {
        if (!phpInfo) return [];
        const lowerFilter = filter.toLowerCase();
        return Object.entries(phpInfo.ini_settings).filter(([key]) =>
            key.toLowerCase().includes(lowerFilter)
        );
    }, [phpInfo, filter]);

    const getTabClass = (tabName: string) => `py-2 px-4 text-sm font-medium rounded-t-lg ${activeTab === tabName ? 'bg-base-100 dark:bg-base-dark-200 border-b-0' : 'bg-base-200 dark:bg-base-dark-300 hover:bg-base-100/50'}`;

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center items-center p-8"><SpinnerIcon className="w-8 h-8" /></div>;
        if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
        if (!phpInfo) return <div className="p-4 text-center">{t('php_info.no_data', '情報を取得できませんでした。')}</div>;

        switch (activeTab) {
            case 'basic':
                return (
                    <div className="space-y-2 text-sm p-4">
                        <p><strong>{t('php_info.php_version', 'PHP Version:')}</strong> <span className="font-mono text-lg">{phpInfo.php_version}</span></p>
                        <p><strong>{t('php_info.server_software', 'Server Software:')}</strong> {phpInfo.ini_settings?.['SERVER_SOFTWARE']?.local_value || 'N/A'}</p>
                        <p><strong>{t('php_info.max_execution_time', 'Max Execution Time:')}</strong> {phpInfo.ini_settings?.['max_execution_time']?.local_value}s</p>
                        <p><strong>{t('php_info.memory_limit', 'Memory Limit:')}</strong> {phpInfo.ini_settings?.['memory_limit']?.local_value}</p>
                        <p><strong>{t('php_info.upload_max_filesize', 'Upload Max Filesize:')}</strong> {phpInfo.ini_settings?.['upload_max_filesize']?.local_value}</p>
                    </div>
                );
            case 'all-settings':
                return (
                    <div className="p-4">
                        <Input 
                            type="text"
                            placeholder={t('php_info.search_placeholder', '設定を検索...')}
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="mb-4"
                        />
                        <div className="overflow-auto max-h-[60vh]">
                            <table className="min-w-full text-xs">
                                <thead className="bg-base-200 dark:bg-base-dark-300 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">{t('php_info.setting_name', '設定名')}</th>
                                        <th className="p-2 text-left">{t('php_info.local_value', 'ローカル値')}</th>
                                        <th className="p-2 text-left">{t('php_info.global_value', 'グローバル値')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSettings.map(([key, value]) => (
                                        <tr key={key} className="border-t">
                                            <td className="p-2 font-mono break-all">{key}</td>
                                            <td className="p-2 font-mono break-all">{value.local_value}</td>
                                            <td className="p-2 font-mono break-all">{value.global_value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'phpinfo':
                return (
                     <div className="p-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm rounded-md mb-4">
                            <strong>{t('php_info.warning', '警告:')}</strong> {t('php_info.warning_message', 'この情報にはサーバー環境に関する機密情報が含まれる可能性があります。取り扱いには十分ご注意ください。')}
                        </div>
                        <iframe
                            srcDoc={phpInfo.phpinfo_html}
                            title="phpinfo"
                            className="w-full h-[60vh] border rounded-md"
                            sandbox="" // Sandboxing is off to allow styles to be applied from parent
                        />
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title={t('php_info.title', 'PHP情報ビューア')}
                description={t('php_info.description', 'サーバーのPHPバージョンと設定情報を確認します。')}
            />
            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md mt-4">
                <div className="border-b border-default mb-4">
                    <nav className="flex space-x-2">
                        <button onClick={() => setActiveTab('basic')} className={getTabClass('basic')}>{t('php_info.tab_basic', '基本情報')}</button>
                        <button onClick={() => setActiveTab('all-settings')} className={getTabClass('all-settings')}>{t('php_info.tab_all_settings', '全設定一覧')}</button>
                        <button onClick={() => setActiveTab('phpinfo')} className={getTabClass('phpinfo')}>{t('php_info.tab_phpinfo', 'phpinfo()')}</button>
                    </nav>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default PhpInfoViewer;
