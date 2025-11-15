import React, { useEffect, useMemo, useState } from 'react';
import { Database, Row } from '@shared/types';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon } from '@components/atoms';

interface BackupManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const BackupManager: React.FC<BackupManagerProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('backup-manager');
    const [settings, setSettings] = useState({
        enabled: false,
        hour: 2,
        retentionDays: 14
    });
    const [isLoading, setIsLoading] = useState(true);

    const settingsMap = useMemo(() => new Map(database.settings.data.map(s => [s.key, s.value])), [database.settings]);

    useEffect(() => {
        const enabled = settingsMap.get('BACKUP_ENABLED') === 'true';
        const hour = parseInt(String(settingsMap.get('BACKUP_HOUR')), 10) || 2;
        const retentionDays = parseInt(String(settingsMap.get('BACKUP_RETENTION_DAYS')), 10) || 14;
        
        setSettings({ enabled, hour, retentionDays });
        setIsLoading(false);
    }, [settingsMap]);

    const handleSettingChange = (key: keyof typeof settings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSave = () => {
        const operations = [
            { key: 'BACKUP_ENABLED', value: String(settings.enabled) },
            { key: 'BACKUP_HOUR', value: String(settings.hour) },
            { key: 'BACKUP_RETENTION_DAYS', value: String(settings.retentionDays) },
        ];

        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const settingsTable = newDb.settings.data;
            
            operations.forEach(op => {
                const settingIndex = settingsTable.findIndex((s: Row) => s.key === op.key);
                if (settingIndex > -1) {
                    settingsTable[settingIndex].value = op.value;
                } else {
                    settingsTable.push({ key: op.key, value: op.value });
                }
            });
            return newDb;
        });

        alert(t('backup.save_success', '設定を保存しました。次回のCronジョブ実行時からこの設定が適用されます。'));
    };

    if (isLoading) {
        return <SpinnerIcon className="w-10 h-10 mx-auto" />;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('backup.title', '自動バックアップ設定')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('backup.description', 'データベースの自動バックアップの動作を制御します。')}</p>
            </header>

            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">{t('backup.target_heading', 'バックアップ対象について')}</h2>
                <div className="text-sm space-y-4 text-base-content dark:text-base-dark-content">
                    <p dangerouslySetInnerHTML={{ __html: t('backup.target_description', '現在設定されている自動バックアップは、アプリケーションが使用している<strong>データベース全体</strong>を対象としています。') }} />
                    <p>{t('backup.target_details', '具体的には、以下の情報がすべて含まれます。')}</p>
                    
                    <div>
                        <h3 className="font-semibold mb-2">{t('backup.content_list', 'バックアップされる主な内容一覧')}</h3>
                        <ul className="list-disc list-inside space-y-2 text-xs pl-2">
                            <li>
                                <strong>{t('backup.customer_info', '顧客情報')}:</strong>
                                <ul className="list-['-_'] list-inside pl-4">
                                    <li>{t('backup.customer_info_detail', '顧客リスト、顧客グループ、連絡先など')}</li>
                                </ul>
                            </li>
                            <li>
                                <strong>{t('backup.product_info', '商品情報')}:</strong>
                                <ul className="list-['-_'] list-inside pl-4">
                                    <li>{t('backup.product_info_detail', '商品マスター、価格、在庫数、カラーやサイズなどの商品定義')}</li>
                                </ul>
                            </li>
                             <li>
                                <strong>{t('backup.quote_info', '案件・見積情報')}:</strong>
                                <ul className="list-['-_'] list-inside pl-4">
                                    <li>{t('backup.quote_info_detail', '過去の見積もり履歴、案件のステータス、デザイン情報、商品明細など')}</li>
                                </ul>
                            </li>
                             <li>
                                <strong>{t('backup.pricing_settings', '価格設定')}:</strong>
                                <ul className="list-['-_'] list-inside pl-4">
                                     <li>{t('backup.pricing_settings_detail', 'プリント単価表、製版代、特殊インク代などの各種料金設定')}</li>
                                </ul>
                            </li>
                             <li>
                                <strong>{t('backup.production_history', '製造・履歴情報')}:</strong>
                                <ul className="list-['-_'] list-inside pl-4">
                                    <li>{t('backup.production_history_detail', '印刷履歴、インクの配合レシピなど')}</li>
                                </ul>
                            </li>
                            <li>
                                <strong>{t('backup.system_settings', 'システム設定')}:</strong>
                                <ul className="list-['-_'] list-inside pl-4">
                                    <li>{t('backup.system_settings_detail', 'ユーザーアカウント、権限設定、PDFテンプレート、会社の基本情報など')}</li>
                                </ul>
                            </li>
                        </ul>
                    </div>

                    <p dangerouslySetInnerHTML={{ __html: t('backup.summary', '要するに、<strong>この管理画面で入力・設定したほぼすべてのデータ</strong>がバックアップの対象となります。') }} />

                    <div>
                        <h3 className="font-semibold mb-2">{t('backup.format_heading', 'バックアップの形式と目的')}</h3>
                        <p>{t('backup.format_description', 'データは、データベースを丸ごと復元できる「SQLファイル」という形式で圧縮して保存されます。これにより、万が一サーバーに問題が発生した場合でも、バックアップした時点の状態にシステム全体を正確に復元することが可能です。')}</p>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200">
                        <h4 className="font-bold">{t('backup.excluded_heading', '【重要】バックアップ対象外のもの')}</h4>
                        <p className="mt-2" dangerouslySetInnerHTML={{ __html: t('backup.excluded_description', 'お客様からアップロードされた<strong>画像ファイルそのもの</strong>（仕上がりイメージの元画像など）は、このデータベースバックアップには含まれません。画像ファイルのバックアップは、別途サーバーのファイルシステムレベルでご対応いただく必要があります。') }} />
                    </div>
                </div>
            </div>
            
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md space-y-6">
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h3 className="font-bold text-lg">{t('backup.auto_enable', '自動バックアップ')}</h3>
                        <p className="text-sm text-gray-500">{t('backup.auto_enable_description', 'データベース全体の自動バックアップを有効または無効にします。')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings.enabled} onChange={e => handleSettingChange('enabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                </div>
                
                <div className={`transition-opacity duration-300 ${settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border rounded-lg">
                            <label htmlFor="backup-hour" className="block text-sm font-medium mb-1">{t('backup.execution_time', '実行時刻')}</label>
                            <select
                                id="backup-hour"
                                value={settings.hour}
                                onChange={e => handleSettingChange('hour', parseInt(e.target.value))}
                                className="w-full bg-base-200 dark:bg-base-dark-300 border-base-300 dark:border-base-dark-300 rounded-md p-2 text-sm"
                                disabled={!settings.enabled}
                            >
                                {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                ))}
                            </select>
                             <p className="text-xs text-gray-500 mt-1">{t('backup.execution_time_description', '毎日この時刻にバックアップが実行されます。')}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <label htmlFor="retention-days" className="block text-sm font-medium mb-1">{t('backup.retention_period', 'バックアップ保持期間')}</label>
                            <input
                                type="number"
                                id="retention-days"
                                value={settings.retentionDays}
                                onChange={e => handleSettingChange('retentionDays', parseInt(e.target.value))}
                                className="w-full bg-base-200 dark:bg-base-dark-300 border-base-300 dark:border-base-dark-300 rounded-md p-2 text-sm"
                                min="1"
                                max="90"
                                disabled={!settings.enabled}
                            />
                             <p className="text-xs text-gray-500 mt-1">{t('backup.retention_period_description', 'この日数を超えた古いバックアップは自動的に削除されます。')}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-base-300 dark:border-base-dark-300">
                     <h3 className="font-bold text-lg">{t('backup.server_settings', 'サーバー設定')}</h3>
                     <div className="text-sm p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg mt-2">
                         <p className="font-semibold mb-2">{t('backup.server_settings_warning', '重要：サーバーでのCronジョブ設定が必要です')}</p>
                         <p dangerouslySetInnerHTML={{ __html: t('backup.server_settings_description', 'このツールはバックアップの動作を制御するだけで、自動実行の仕組みそのものではありません。サーバーのコントロールパネル（例: Xserverの「CRON設定」）で、以下のコマンドを<strong className="font-bold">1時間ごと</strong>に実行するように設定してください。') }} />
                         <code className="block bg-black/80 text-white font-mono text-xs p-3 rounded-md mt-2 break-all">
                             /usr/bin/php /home/【サーバーID】/【ドメイン名】/public_html/api/backup_database.php
                         </code>
                         <p className="text-xs mt-2">{t('backup.server_settings_note', '※ 上記コマンドのパスは、実際のサーバー環境に合わせて修正してください。')}</p>
                     </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button onClick={handleSave} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-blue-800 transition-colors">
                        {t('backup.save_settings', '設定を保存')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BackupManager;