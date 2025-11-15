import React, { useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { AppMode } from '@core/types/appMode';

const CsvRewriteSettings: React.FC<{
    appMode: AppMode;
    onOpenPromptModal: () => void;
}> = ({ appMode, onOpenPromptModal }) => {
    const { t } = useTranslation('dev-tools');
    const [csvEncoding, setCsvEncoding] = useState(localStorage.getItem('csvEncoding') || 'UTF-8');

    const handleEncodingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newEncoding = e.target.value;
        setCsvEncoding(newEncoding);
        localStorage.setItem('csvEncoding', newEncoding);
        alert(t('csv_rewrite.encoding_set', 'CSV文字コードを「{encoding}」に設定しました。ページを再読み込みして変更を適用します。').replace('{encoding}', newEncoding));
        window.location.reload();
    };
    
    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">{t('csv_rewrite.title', 'DBからCSVへの書き戻し')}</h2>
            {(appMode === 'csv-debug' || appMode === 'csv-writable') && (
                <div className="mb-4">
                    <label htmlFor="csv-encoding-select" className="block text-sm font-medium mb-1">
                        {t('csv_rewrite.encoding_label', 'CSVファイルの文字コード')}
                    </label>
                    <select
                        id="csv-encoding-select"
                        value={csvEncoding}
                        onChange={handleEncodingChange}
                        className="w-full bg-input-bg dark:bg-input-bg-dark border border-default rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                    >
                        <option value="Shift-JIS">{t('csv_rewrite.shift_jis', 'Shift_JIS (Windows標準)')}</option>
                        <option value="UTF-8">{t('csv_rewrite.utf8', 'UTF-8')}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">{t('csv_rewrite.encoding_note', 'CSVファイルが文字化けする場合に切り替えてください。')}</p>
                </div>
            )}
            <p className="text-sm text-gray-500 mb-2">
                {t('csv_rewrite.description', '現在のメモリ上のデータベース状態（UIでの変更を含む）を元に、プロジェクト内のCSVファイルを更新するためのAIプロンプトを生成します。')}
            </p>
            <button
                onClick={onOpenPromptModal}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                {t('csv_rewrite.apply_button', '現在の変更をCSVに反映...')}
            </button>
        </div>
    );
};

export default CsvRewriteSettings;
