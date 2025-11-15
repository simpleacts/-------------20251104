import React, { useState, useMemo } from 'react';
import { Database, Row } from '@shared/types';
import { SparklesIcon, SpinnerIcon, XMarkIcon, PlusIcon, Select } from '@components/atoms';
import { fetchColorChunk } from '@shared/services/geminiService';
import DataTable from '@components/organisms/DataTable';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

const AiColorLibraryPopulator: React.FC<{
    onAddColors: (tableName: 'pantone_colors' | 'dic_colors', colors: Row[]) => void;
}> = ({ onAddColors }) => {
    const { database } = useDatabase();
    const [isOpen, setIsOpen] = useState(false);
    const [standard, setStandard] = useState<'pantone' | 'dic'>('pantone');
    const [pantoneType, setPantoneType] = useState<string>('coated');
    const [dicPart, setDicPart] = useState<string>('1');
    
    // データベースからカラーライブラリとタイプを取得
    const colorLibraries = useMemo(() => {
        const libraries = database?.color_libraries?.data || [];
        return [...libraries].sort((a, b) => {
            const aOrder = (a.sort_order as number) || 0;
            const bOrder = (b.sort_order as number) || 0;
            return aOrder - bOrder;
        });
    }, [database?.color_libraries]);
    
    const colorLibraryTypes = useMemo(() => {
        const types = database?.color_library_types?.data || [];
        return [...types].sort((a, b) => {
            const aOrder = (a.sort_order as number) || 0;
            const bOrder = (b.sort_order as number) || 0;
            return aOrder - bOrder;
        });
    }, [database?.color_library_types]);
    
    // 選択されたライブラリに対応するタイプを取得
    const availableTypes = useMemo(() => {
        if (!standard || colorLibraries.length === 0) return [];
        const selectedLibrary = colorLibraries.find(lib => 
            (standard === 'pantone' && lib.code === 'pantone') ||
            (standard === 'dic' && lib.code === 'dic')
        );
        if (!selectedLibrary) return [];
        return colorLibraryTypes.filter(type => type.library_id === selectedLibrary.id);
    }, [standard, colorLibraries, colorLibraryTypes]);
    
    // デフォルト値の設定
    React.useEffect(() => {
        if (availableTypes.length > 0 && !pantoneType && !dicPart) {
            if (standard === 'pantone') {
                setPantoneType(availableTypes[0]?.code as string || 'coated');
            } else {
                setDicPart(availableTypes[0]?.code as string || '1');
            }
        }
    }, [availableTypes, standard]);
    const [start, setStart] = useState(100);
    const [end, setEnd] = useState(199);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetch = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let details: any;
            if (standard === 'pantone') {
                details = { standard, type: pantoneType, start, end };
            } else {
                details = { standard, part: dicPart, start, end };
            }

            const newColors = await fetchColorChunk(details);
            if (newColors && newColors.length > 0) {
                onAddColors(standard === 'pantone' ? 'pantone_colors' : 'dic_colors', newColors);
                alert(`${newColors.length}件のカラーデータを取得しました。`);
                setIsOpen(false);
            } else {
                setError("指定された範囲のカラーデータが見つかりませんでした。");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "カラーデータの取得に失敗しました。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
      <>
        <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            <SparklesIcon className="w-5 h-5" /> AIでカラーライブラリを拡充
        </button>

        {isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={() => setIsOpen(false)}>
                <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                    <header className="flex justify-between items-center p-4 border-b"><h3 className="text-lg font-bold flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-500"/>AIでカラーライブラリを拡充</h3><button onClick={() => setIsOpen(false)}><XMarkIcon/></button></header>
                    <main className="p-6 space-y-4">
                        {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded">{error}</p>}
                        <div><label className="font-semibold text-sm">カラースタンダード</label><div className="flex gap-2 mt-1"><button onClick={() => setStandard('pantone')} className={`flex-1 p-2 rounded ${standard === 'pantone' ? 'bg-brand-primary text-white' : 'bg-gray-200'}`}>Pantone</button><button onClick={() => setStandard('dic')} className={`flex-1 p-2 rounded ${standard === 'dic' ? 'bg-brand-primary text-white' : 'bg-gray-200'}`}>DIC</button></div></div>
                        {standard === 'pantone' && (
                            <div>
                                <label className="font-semibold text-sm">タイプ</label>
                                <Select
                                    value={pantoneType || ''}
                                    onChange={e => setPantoneType(e.target.value)}
                                    className="w-full p-2 border rounded mt-1"
                                >
                                    <option value="">タイプを選択してください</option>
                                    {availableTypes.map(type => (
                                        <option key={type.id as string} value={type.code as string}>
                                            {type.name}
                                        </option>
                                    ))}
                                </Select>
                                {availableTypes.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">※ タイプは商品定義管理で設定できます</p>
                                )}
                            </div>
                        )}
                        {standard === 'dic' && (
                            <div>
                                <label className="font-semibold text-sm">パート</label>
                                <Select
                                    value={dicPart || ''}
                                    onChange={e => setDicPart(e.target.value)}
                                    className="w-full p-2 border rounded mt-1"
                                >
                                    <option value="">パートを選択してください</option>
                                    {availableTypes.map(type => (
                                        <option key={type.id as string} value={type.code as string}>
                                            {type.name}
                                        </option>
                                    ))}
                                </Select>
                                {availableTypes.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">※ パートは商品定義管理で設定できます</p>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="font-semibold text-sm">開始番号</label><input type="number" value={start} onChange={e => setStart(Number(e.target.value))} className="w-full p-2 border rounded mt-1"/></div>
                            <div><label className="font-semibold text-sm">終了番号</label><input type="number" value={end} onChange={e => setEnd(Number(e.target.value))} className="w-full p-2 border rounded mt-1"/></div>
                        </div>
                    </main>
                    <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50"><button onClick={() => setIsOpen(false)} className="px-4 py-2 rounded bg-gray-300">キャンセル</button><button onClick={handleFetch} disabled={isLoading} className="px-4 py-2 rounded bg-brand-primary text-white flex items-center gap-2 disabled:bg-gray-400">{isLoading ? <SpinnerIcon/> : <SparklesIcon/>} {isLoading ? '取得中...' : 'データを取得'}</button></footer>
                </div>
            </div>
        )}
      </>
    );
};


const ColorLibraryManager: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const [activeTab, setActiveTab] = useState<'pantone' | 'dic'>('pantone');

    const handleAddColors = async (tableName: 'pantone_colors' | 'dic_colors', newColors: Row[]) => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (!newDb[tableName]) return newDb; // Should not happen

            const existingIds = new Set(newDb[tableName].data.map((c: Row) => c.id));
            const uniqueNewColors = newColors.filter(c => !existingIds.has(c.id));
            newDb[tableName].data.push(...uniqueNewColors);
            return newDb;
        });

        // サーバーに保存
        try {
            const existingIds = new Set((database[tableName]?.data || []).map((c: Row) => c.id));
            const uniqueNewColors = newColors.filter(c => !existingIds.has(c.id));
            
            if (uniqueNewColors.length > 0) {
                const operations = uniqueNewColors.map(color => ({
                    type: 'INSERT' as const,
                    data: color
                }));
                const result = await updateDatabase(currentPage, tableName, operations, database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to add colors to ${tableName} on server`);
                }
            }
        } catch (error) {
            console.error('[ColorLibraryManager] Failed to add colors to server:', error);
            alert('サーバーへの追加に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const activeTable = useMemo(() => {
        return activeTab === 'pantone' ? database?.pantone_colors : database?.dic_colors;
    }, [activeTab, database]);

    if (!database || !database.pantone_colors || !database.dic_colors) {
        return <div className="p-4"><SpinnerIcon className="w-8 h-8"/></div>;
    }

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">カラーライブラリ管理</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">PANTONE®やDICのカラーデータを管理し、AIで拡充します。</p>
                </div>
                <AiColorLibraryPopulator onAddColors={handleAddColors} />
            </header>

            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('pantone')} className={`${activeTab === 'pantone' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        PANTONE® Colors ({database.pantone_colors.data.length})
                    </button>
                    <button onClick={() => setActiveTab('dic')} className={`${activeTab === 'dic' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        DIC Colors ({database.dic_colors.data.length})
                    </button>
                </nav>
            </div>
            
            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-hidden">
                {activeTable && (
                    <DataTable
                        schema={activeTable.schema}
                        data={activeTable.data}
                        tableName={activeTab === 'pantone' ? 'pantone_colors' : 'dic_colors'}
                        onUpdateRow={() => {}} // Read-only for now
                        onDeleteRow={() => {}} // Read-only for now
                        permissions={{}}
                    />
                )}
            </div>
        </div>
    );
};

export default ColorLibraryManager;
