import React, { useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useCategorizedTables } from '@shared/hooks/useCategorizedTables';
import { Button, CheckIcon, SpinnerIcon, UploadIcon, XMarkIcon, Input, Select } from '@components/atoms';
import { parseCsvInWorker } from '../services/workerService';

interface GenericImportResult {
    success: boolean;
    message: string;
    summary: {
        totalRows: number;
        insertedRows: number;
        errors: string[];
    }
}

const GenericImporter: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const [step, setStep] = useState(1);
    const [selectedTable, setSelectedTable] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<GenericImportResult | null>(null);
    const [encoding, setEncoding] = useState('Shift-JIS');

    const { allTableNames, TABLE_DISPLAY_NAMES } = useCategorizedTables();

    const tableOptions = useMemo(() => allTableNames.map(name => ({ value: name, label: TABLE_DISPLAY_NAMES[name] || name })), [allTableNames, TABLE_DISPLAY_NAMES]);
    const tableSchema = useMemo(() => database?.[selectedTable]?.schema || [], [database, selectedTable]);

    const resetState = () => {
        setStep(1); setSelectedTable(''); setCsvFile(null); setCsvHeaders([]); setMapping({});
        setError(null); setIsLoading(false); setImportResult(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCsvFile(file); setError(null); setImportResult(null); setIsLoading(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    if (!arrayBuffer) throw new Error("ファイルの読み込みに失敗しました。");
                    const decoder = new TextDecoder(encoding);
                    const text = decoder.decode(arrayBuffer);
                    const data = await parseCsvInWorker(text, file.name);
                    if (data.length === 0) throw new Error('CSVファイルが空か、ヘッダー行しかありません。');
                    setCsvHeaders(Object.keys(data[0]));
                    setStep(2);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'CSVの解析に失敗しました。');
                } finally { setIsLoading(false); }
            };
            reader.readAsArrayBuffer(file);
        }
    };
    
    const handleImport = async () => {
        setIsLoading(true); setError(null); setImportResult(null);
        try {
            const fileText = await csvFile?.text();
            if (!fileText) throw new Error("CSVファイルが読み込めません。");
            const csvData = await parseCsvInWorker(fileText, csvFile.name);

            const response = await fetch('/api/import-generic.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tableName: selectedTable, 
                    mapping, 
                    data: csvData,
                    tool_name: 'data-io' // ツール名を明示的に送信
                })
            });
            if (!response.ok) throw new Error(`サーバーエラー: ${response.statusText}`);
            
            const result: GenericImportResult & { updatedTable?: Record<string, any> } = await response.json();
            setImportResult(result); setStep(3);
            if (result.success) {
                // import-generic.phpから更新されたテーブルデータを取得（data-io-data.phpへの依存を削除）
                if (result.updatedTable) {
                    setDatabase(db => ({ ...db, ...result.updatedTable }));
                }
            } else { setError(result.message || 'インポート中に不明なエラーが発生しました。'); }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'インポート処理に失敗しました。');
            setStep(2);
        } finally { setIsLoading(false); }
    };
    
    const targetSchema = useMemo(() => {
        if (!selectedTable || !database) return [];
        const pk = database[selectedTable]?.schema[0]?.name;
        return database[selectedTable]?.schema.filter(col => col.name !== pk) || [];
    }, [database, selectedTable]);
    
    const isMappingComplete = useMemo(() => {
        return targetSchema.length > 0 && targetSchema.every(col => !!mapping[col.name]);
    }, [mapping, targetSchema]);

    if (!database) {
        return <div className="flex justify-center items-center p-8"><SpinnerIcon className="w-8 h-8"/></div>
    }

    return (
        <div className="bg-container-bg dark:bg-container-bg-dark p-6 rounded-lg shadow-md">
             {error && <div className="mb-4 p-3 rounded-md text-sm bg-red-100 text-red-800"><XMarkIcon className="w-5 h-5 inline mr-2"/>{error}</div>}
            
            {step === 1 && (
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">1. インポート先のテーブルを選択</label>
                        <Select value={selectedTable} onChange={e => setSelectedTable(e.target.value)}>
                            <option value="">テーブルを選択...</option>
                            {tableOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">2. ファイルの文字コード</label>
                        <Select value={encoding} onChange={e => setEncoding(e.target.value)}>
                            <option value="Shift-JIS">Shift_JIS (Windows標準)</option>
                            <option value="UTF-8">UTF-8</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">3. CSVファイルをアップロード</label>
                        <Input type="file" accept=".csv" onChange={handleFileChange} disabled={!selectedTable || isLoading} />
                    </div>
                     {isLoading && <div className="text-center"><SpinnerIcon className="w-8 h-8 mx-auto" /><p>ファイルを解析中...</p></div>}
                </div>
            )}
            
            {step === 2 && (
                <div>
                    <h3 className="text-lg font-bold mb-4">ステップ2: CSVの列をマッピング (テーブル: {selectedTable})</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {targetSchema.map(col => {
                            const selectId = `generic-import-field-${col.id}`;
                            return (
                                <div key={col.id} className="grid grid-cols-2 gap-4 items-center">
                                    <label htmlFor={selectId} className="font-semibold text-sm">{col.name} <span className="text-gray-400">({col.type})</span></label>
                                    <Select id={selectId} name={col.name} onChange={e => setMapping(prev => ({ ...prev, [col.name]: e.target.value }))} value={mapping[col.name] || ''}>
                                        <option value="">CSV列を選択...</option>
                                        {csvHeaders.map(header => <option key={header} value={header}>{header}</option>)}
                                    </Select>
                                </div>
                            );
                        })}
                    </div>
                     <div className="flex justify-between mt-6">
                        <Button variant="secondary" onClick={() => setStep(1)}>戻る</Button>
                        <Button onClick={handleImport} disabled={!isMappingComplete || isLoading} className="flex items-center gap-2">
                            {isLoading ? <SpinnerIcon /> : <UploadIcon />} {isLoading ? 'インポート中...' : 'インポート実行'}
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && importResult && (
                 <div>
                    <h3 className="text-lg font-bold mb-4">ステップ3: インポート結果</h3>
                    <div className={`p-4 rounded-md space-y-2 ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                       <p className="font-bold flex items-center gap-2">{importResult.success ? <CheckIcon className="text-green-600"/> : <XMarkIcon className="text-red-600"/>} {importResult.message}</p>
                       <ul className="list-disc list-inside pl-4 text-sm">
                           <li>処理対象行数: {importResult.summary.totalRows}</li>
                           <li>新規登録行数: {importResult.summary.insertedRows}</li>
                       </ul>
                       {importResult.summary.errors.length > 0 && (
                           <div className="pt-2 mt-2 border-t">
                               <p className="font-semibold text-red-700">エラー詳細:</p>
                               <ul className="list-disc list-inside pl-4 text-xs max-h-40 overflow-y-auto">
                                   {importResult.summary.errors.map((err, i) => <li key={i}>{err}</li>)}
                               </ul>
                           </div>
                       )}
                    </div>
                    <Button onClick={resetState} className="mt-4">別のファイルをインポート</Button>
                </div>
            )}
        </div>
    )
};

export default GenericImporter;