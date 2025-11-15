import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase } from '@core/utils';
import { useTranslation } from '@shared/hooks/useTranslation';
import AddRowModal from '@shared/modals/AddRowModal';
import { Database, Row } from '@shared/types';
import { PlusIcon } from '@components/atoms';
import DataTable from '@components/organisms/DataTable';

interface PdfPreviewSettingsToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const PdfPreviewSettingsTool: React.FC<PdfPreviewSettingsToolProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('pdf-preview-settings');
    const { currentPage } = useNavigation();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    useEffect(() => {
        const loadData = async () => {
            if (!database || database.pdf_preview_zoom_configs) return;
            
            try {
                const data = await fetchTables(['pdf_preview_zoom_configs'], { toolName: 'pdf-preview-settings' });
                setDatabase(prev => ({...(prev || {}), ...data}));
            } catch (err) {
                console.error('Failed to load pdf_preview_zoom_configs:', err);
            }
        };
        loadData();
    }, [database, setDatabase]);
    
    const table = useMemo(() => database.pdf_preview_zoom_configs, [database]);

    if (!table) {
        return <div>{t('pdf_preview.table_not_found', "'pdf_preview_zoom_configs' テーブルが見つかりません。データベースのセットアップを確認してください。")}</div>;
    }

    const handleUpdateRow = async (rowIndex: number, newRowData: Row) => {
        const rowId = table.data[rowIndex]?.id;
        if (!rowId) return;

        // まずローカル状態を更新
        setDatabase(prevDb => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));
            newDb.pdf_preview_zoom_configs.data[rowIndex] = newRowData;
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = [{
                type: 'UPDATE' as const,
                data: newRowData,
                where: { id: rowId }
            }];
            const result = await updateDatabase(currentPage, 'pdf_preview_zoom_configs', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to update pdf preview zoom config to server');
            }
        } catch (error) {
            console.error('[PdfPreviewSettings] Failed to update to server:', error);
            alert(t('pdf_preview.update_failed', 'サーバーへの更新に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const handleDeleteRow = async (rowIndex: number) => {
        const rowId = table.data[rowIndex]?.id;
        if (!rowId || !window.confirm(t('pdf_preview.delete_confirm', 'この設定を削除しますか？'))) return;

        // まずローカル状態から削除
        setDatabase(prevDb => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));
            newDb.pdf_preview_zoom_configs.data.splice(rowIndex, 1);
            return newDb;
        });

        // サーバーから削除
        try {
            const operation = [{ type: 'DELETE' as const, where: { id: rowId } }];
            const result = await updateDatabase(currentPage, 'pdf_preview_zoom_configs', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete pdf preview zoom config from server');
            }
        } catch (error) {
            console.error('[PdfPreviewSettings] Failed to delete from server:', error);
            alert(t('pdf_preview.delete_failed', 'サーバーからの削除に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleAddRow = async (newRows: { tableName: string, data: Row }[]) => {
        // まずローカル状態を更新
        setDatabase(prevDb => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));
            newRows.forEach(rowInfo => {
                 if (newDb[rowInfo.tableName]) {
                    newDb[rowInfo.tableName].data.push(rowInfo.data);
                 }
            });
            return newDb;
        });

        // サーバーに保存
        try {
            const operations = newRows.map(rowInfo => ({
                type: 'INSERT' as const,
                data: rowInfo.data
            }));
            for (const rowInfo of newRows) {
                const result = await updateDatabase(currentPage, rowInfo.tableName, [operations.find(op => op.data === rowInfo.data)!], database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to add ${rowInfo.tableName} to server`);
                }
            }
        } catch (error) {
            console.error('[PdfPreviewSettings] Failed to add to server:', error);
            alert(t('pdf_preview.add_failed', 'サーバーへの追加に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('pdf_preview.title', 'PDFプレビュー設定')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('pdf_preview.description', '各ツールに埋め込まれたPDFプレビューの初期ズーム率などを管理します。')}
                    </p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg">
                    <PlusIcon className="w-5 h-5"/> {t('pdf_preview.add_setting', '新規ズーム設定を追加')}
                </button>
            </header>
            
            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                <DataTable
                    schema={table.schema}
                    data={table.data}
                    tableName="pdf_preview_zoom_configs"
                    onUpdateRow={handleUpdateRow}
                    onDeleteRow={handleDeleteRow}
                    permissions={{}}
                />
            </div>

            {isAddModalOpen && (
                <AddRowModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    schema={table.schema}
                    onAddRow={handleAddRow}
                    tableName="pdf_preview_zoom_configs"
                    database={database}
                />
            )}
        </div>
    );
};

export default PdfPreviewSettingsTool;