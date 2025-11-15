import React, { useEffect, useState } from 'react';
import { fetchTables } from '@core/data/db.live';
import { Database, Row } from '@shared/types';
import { SpinnerIcon } from '@components/atoms';
import OrderSearchModal from '@features/proofing-tool/modals/OrderSearchModal';
import HistoryControlPanel from '../organisms/HistoryControlPanel';
import HistoryList from '../organisms/HistoryList';
import NewHistoryForm from '../organisms/NewHistoryForm';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

interface PrintHistoryToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const PrintHistoryToolTemplate: React.FC<PrintHistoryToolProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [localDatabase, setLocalDatabase] = useState<Partial<Database> | null>(database);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedQuote, setSelectedQuote] = useState<Row | null>(null);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const requiredTables = ['quotes', 'quote_designs', 'print_history', 'print_history_positions', 'print_history_images', 'print_locations', 'customers', 'print_location_metrics'];
                // 注意: product_pricesは非推奨（stockテーブルから取得）
                const data = await fetchTables(requiredTables, { toolName: 'print-history' });
                setLocalDatabase(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);
    
    useEffect(() => {
        if(database) {
            setLocalDatabase(database);
        }
    }, [database]);


    const handleQuoteSelect = (quote: Row) => {
        setSelectedQuote(quote);
        setIsQuoteModalOpen(false);
        setIsFormOpen(false);
    };

    const handleSave = async (operations: { tableName: string, data: Row }[]) => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            operations.forEach(op => {
                if (newDb[op.tableName]) {
                    (newDb[op.tableName] as any).data.push(op.data);
                }
            });
            return newDb;
        });

        // サーバーに保存
        try {
            // テーブルごとにグループ化
            const operationsByTable = new Map<string, any[]>();
            operations.forEach(op => {
                if (!operationsByTable.has(op.tableName)) {
                    operationsByTable.set(op.tableName, []);
                }
                operationsByTable.get(op.tableName)!.push({
                    type: 'INSERT' as const,
                    data: op.data
                });
            });

            // 各テーブルに保存
            for (const [tableName, ops] of operationsByTable.entries()) {
                const result = await updateDatabase(currentPage, tableName, ops, database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to save ${tableName} to server`);
                }
            }
        } catch (error) {
            console.error('[PrintHistory] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }

        setIsFormOpen(false);
    };

    const handleDelete = async (historyId: string) => {
         if (window.confirm('この履歴を削除しますか？この操作は元に戻せません。')) {
            // まずローカル状態から削除
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                newDb.print_history.data = newDb.print_history.data.filter((r: Row) => r.id !== historyId);
                newDb.print_history_positions.data = newDb.print_history_positions.data.filter((r: Row) => r.print_history_id !== historyId);
                newDb.print_history_images.data = newDb.print_history_images.data.filter((r: Row) => r.print_history_id !== historyId);
                return newDb;
            });

            // サーバーから削除
            try {
                // 関連データを削除（順序が重要）
                const positionsResult = await updateDatabase(
                    currentPage,
                    'print_history_positions',
                    [{ type: 'DELETE' as const, where: { print_history_id: historyId } }],
                    database
                );
                if (!positionsResult.success) {
                    throw new Error(positionsResult.error || 'Failed to delete print history positions from server');
                }

                const imagesResult = await updateDatabase(
                    currentPage,
                    'print_history_images',
                    [{ type: 'DELETE' as const, where: { print_history_id: historyId } }],
                    database
                );
                if (!imagesResult.success) {
                    throw new Error(imagesResult.error || 'Failed to delete print history images from server');
                }

                const historyResult = await updateDatabase(
                    currentPage,
                    'print_history',
                    [{ type: 'DELETE' as const, where: { id: historyId } }],
                    database
                );
                if (!historyResult.success) {
                    throw new Error(historyResult.error || 'Failed to delete print history from server');
                }
            } catch (error) {
                console.error('[PrintHistory] Failed to delete from server:', error);
                alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };
    
    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><SpinnerIcon className="w-12 h-12" /></div>;
    }
    if (error) {
        return <div className="p-4 text-red-500">{error}</div>;
    }
    if (!localDatabase) {
        return <div className="p-4 text-gray-500">データを読み込めませんでした。</div>;
    }


    return (
        <>
            <div className="flex flex-col h-full">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold">印刷履歴登録ツール</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">案件ごとの印刷位置や仕上がり写真を記録し、再注文時の品質を担保します。</p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
                    <div className="md:col-span-1 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col space-y-4">
                        <HistoryControlPanel
                            selectedQuote={selectedQuote}
                            onSelectQuoteClick={() => setIsQuoteModalOpen(true)}
                            onAddNewClick={() => setIsFormOpen(true)}
                        />
                        <HistoryList
                            database={localDatabase as Database}
                            selectedQuote={selectedQuote}
                            onDelete={handleDelete}
                        />
                    </div>

                    <div className="md:col-span-2 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                        {isFormOpen && selectedQuote ? (
                            <NewHistoryForm
                                selectedQuote={selectedQuote}
                                database={localDatabase as Database}
                                onSave={handleSave}
                                onCancel={() => setIsFormOpen(false)}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">案件を選択して「新規履歴を登録」してください。</div>
                        )}
                    </div>
                </div>
            </div>
            <OrderSearchModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} onSelect={handleQuoteSelect} database={localDatabase as Database} />
        </>
    );
};

export default PrintHistoryToolTemplate;