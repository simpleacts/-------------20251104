import React, { useState } from 'react';
import { IdFormat } from '@shared/types';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon, ExclamationTriangleIcon, SparklesIcon } from '@components/atoms';
import { updateIdFormatFromPrompt } from '@shared/services/geminiService';
import AIQueryForm from '@components/molecules/AIQueryForm';
import IdFormatEditRow from '../molecules/IdFormatEditRow';

interface IdFormatSettingsEditorProps {
    idFormats: Partial<IdFormat>[];
    setIdFormats: React.Dispatch<React.SetStateAction<Partial<IdFormat>[]>>;
    onSave: () => void;
    onApplyAll: () => void;
    isLoading: boolean;
    TABLE_DISPLAY_NAMES: Record<string, string>;
}

const IdFormatSettingsEditor: React.FC<IdFormatSettingsEditorProps> = ({ idFormats, setIdFormats, onSave, onApplyAll, isLoading, TABLE_DISPLAY_NAMES }) => {
    const { t } = useTranslation('id-manager');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [previewChanges, setPreviewChanges] = useState<Partial<IdFormat>[] | null>(null);

    const handleUpdate = (tableName: string, field: 'prefix' | 'padding' | 'is_manufacturer_dependent', value: string | number | boolean) => {
        setIdFormats(prev => prev.map(f => f.table_name === tableName ? { ...f, [field]: value } : f));
    };

    const handleDelete = (tableName: string) => {
        // 削除は実際にはデフォルト値に戻す操作とする
        setIdFormats(prev => prev.map(f => f.table_name === tableName ? { ...f, prefix: '', padding: 0 } : f));
    };

    const handleAiQuerySubmit = async (prompt: string) => {
        setIsAiLoading(true);
        setAiError(null);
        setPreviewChanges(null);
        try {
            const result = await updateIdFormatFromPrompt(prompt, idFormats as IdFormat[]);
            setPreviewChanges(result);
        } catch (error) {
            setAiError(error instanceof Error ? error.message : t('id_format_editor.ai_parse_error', 'AIによる解析に失敗しました。'));
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleApplyAiChanges = () => {
        if (!previewChanges) return;
        setIdFormats(prev => {
            const newFormats = [...prev];
            previewChanges.forEach(change => {
                const index = newFormats.findIndex(f => f.table_name === change.table_name);
                if (index > -1) {
                    newFormats[index] = { ...newFormats[index], ...change };
                }
            });
            return newFormats;
        });
        setPreviewChanges(null);
    };
    
    return (
        <div className="flex-grow flex flex-col min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div className="space-y-4 mb-6 text-sm text-gray-600 dark:text-gray-300">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('id_format_editor.logic_title', 'ID生成ロジックの構成')}</h2>
                        <p>{t('id_format_editor.logic_description', 'このシステムでは、新しいデータが作成される際のID（主キー）の採番ルールをここで一元管理します。IDは主に2つのルールに基づいて生成されます。')}</p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>{t('id_format_editor.sequential_id', '連番ベースID')}:</strong><p className="pl-4 text-xs">{t('id_format_editor.sequential_id_description', 'ほとんどのテーブルで使用される基本的なIDです。「プレフィックス」と、ゼロ埋めされた「連番」で構成されます。（例: `cust_000123`）')}</p></li>
                            <li><strong>{t('id_format_editor.date_based_id', '日付ベースID')}:</strong><p className="pl-4 text-xs">{t('id_format_editor.date_based_id_description', '案件(`quotes`)や請求書(`bills`)など、日付が重要な意味を持つテーブルで使用されます。「プレフィックス」＋「年月日」＋「その日の中での連番」で構成されます。（例: `quot_20240815_001`）')}</p></li>
                        </ul>
                    </div>
                    <div className="bg-base-200 dark:bg-base-dark-300 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-500"/> {t('id_format_editor.ai_assistant_title', 'AIアシスタントによるIDフォーマット設定')}</h3>
                        <AIQueryForm 
                            onQuerySubmit={handleAiQuerySubmit}
                            isLoading={isAiLoading}
                            placeholder={t('id_format_editor.ai_placeholder', '例: 「顧客IDのプレフィックスをCUST-にして、パディングを8桁にしてください」')}
                            buttonText={t('id_format_editor.ai_button', 'AIでルールを生成')}
                        />
                        {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                        {previewChanges && (
                            <div className="mt-4 p-3 bg-base-100 dark:bg-base-dark-200 rounded">
                                <h4 className="font-semibold text-sm mb-2">{t('id_format_editor.ai_preview_title', 'AIによる変更案')}</h4>
                                <ul className="text-xs space-y-1">
                                    {previewChanges.map(change => {
                                        const original = idFormats.find(f => f.table_name === change.table_name);
                                        return (
                                            <li key={change.table_name}>
                                                <strong>{change.table_name}:</strong> 
                                                {change.prefix !== undefined && ` prefix: "${original?.prefix}" → "${change.prefix}"`}
                                                {change.padding !== undefined && ` padding: ${original?.padding} → ${change.padding}`}
                                            </li>
                                        )
                                    })}
                                </ul>
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={() => setPreviewChanges(null)} className="text-xs px-2 py-1 bg-gray-300 rounded">{t('id_format_editor.cancel', 'キャンセル')}</button>
                                    <button onClick={handleApplyAiChanges} className="text-xs px-2 py-1 bg-green-600 text-white rounded">{t('id_format_editor.apply', '適用')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex-shrink-0 flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">{t('id_format_editor.format_settings_title', 'IDフォーマット設定')}</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={onSave} className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700">{t('id_format_editor.save_settings', '設定を保存')}</button>
                            <button onClick={onApplyAll} disabled={isLoading} className="px-4 py-2 text-sm font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-400 flex items-center gap-2">
                            {isLoading ? <SpinnerIcon className="w-5 h-5"/> : <ExclamationTriangleIcon className="w-5 h-5" />} {isLoading ? t('id_format_editor.applying', '適用中...') : t('id_format_editor.apply_to_existing', '既存IDに適用')}
                            </button>
                        </div>
                    </div>
                     <div className="overflow-auto max-h-[60vh]">
                        <table className="min-w-full text-sm">
                            <thead className="bg-base-200 dark:bg-base-dark-300 sticky top-0">
                                <tr>
                                    <th className="p-2 text-left">{t('id_format_editor.table_header', 'テーブル')}</th>
                                    <th className="p-2 text-left">{t('id_format_editor.prefix_header', 'プレフィックス')}</th>
                                    <th className="p-2 text-left">{t('id_format_editor.digits_header', '桁数')}</th>
                                    <th className="p-2 text-left">{t('id_format_editor.manufacturer_header', 'メーカー依存')}</th>
                                    <th className="p-2 text-right">{t('id_format_editor.actions_header', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {idFormats.map(format => (
                                    <IdFormatEditRow
                                        key={format.table_name}
                                        format={format}
                                        onUpdate={handleUpdate}
                                        onDelete={handleDelete}
                                        TABLE_DISPLAY_NAMES={TABLE_DISPLAY_NAMES}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdFormatSettingsEditor;