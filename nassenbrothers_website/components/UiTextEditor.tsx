import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface UiTextEditorProps {
    isLocked: boolean;
}

type UiTextItem = {
    key: string;
    value: string;
    isHeader: boolean;
};

const parseCsv = (csvText: string): UiTextItem[] => {
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    return lines.map(line => {
        const parts = line.split(/,(.*)/s);
        const rawKey = parts[0] ? parts[0].trim() : '';
        let value = parts[1] ? parts[1].trim() : '';
        const isHeader = rawKey.startsWith('"') && rawKey.endsWith('"') && value === '';
        const key = rawKey.replace(/^"|"$/g, '');
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }
        return { key, value, isHeader };
    });
};

const toCsv = (items: UiTextItem[]): string => {
    return items.map(item => {
        let key = item.isHeader ? `"${item.key.replace(/"/g, '""')}"` : item.key;
        let value = item.value;
        if (!item.isHeader && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
        }
        return item.isHeader ? `${key},` : `${key},${value}`;
    }).join('\n');
};

const LockedOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
        <i className="fas fa-lock text-4xl text-gray-500 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-700">機能はロックされています</h3>
        <p className="text-gray-600">この機能の編集は現在ロックされています。</p>
        <p className="text-sm text-gray-500 mt-2">ロックを解除するには、開発ツールに移動してください。</p>
    </div>
);

const UiTextEditor: React.FC<UiTextEditorProps> = ({ isLocked }) => {
    const [items, setItems] = useState<UiTextItem[]>([]);
    const [originalItems, setOriginalItems] = useState<UiTextItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeGroup, setActiveGroup] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/templates/ui_text.csv?cachebust=' + new Date().getTime());
            if (!response.ok) throw new Error('UIテキストファイルの読み込みに失敗しました。');
            
            const csvText = await response.text();
            const parsedItems = parseCsv(csvText);
            setItems(parsedItems);
            setOriginalItems(parsedItems);
            
            const firstGroup = parsedItems.find(item => item.isHeader);
            if (firstGroup) setActiveGroup(firstGroup.key);

        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isDirty = useMemo(() => JSON.stringify(items) !== JSON.stringify(originalItems), [items, originalItems]);

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            const csvContent = toCsv(items);
            const response = await fetch('/api/save_ui_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: csvContent,
            });
            const responseData = await response.json();
            if (!response.ok || !responseData.success) {
                throw new Error(responseData.message || '保存に失敗しました。');
            }
            setSaveStatus('success');
            setOriginalItems(JSON.parse(JSON.stringify(items)));
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
            setSaveStatus('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };
    
    const handleValueChange = (keyToUpdate: string, newValue: string) => {
        setItems(prevItems => prevItems.map(item => item.key === keyToUpdate ? { ...item, value: newValue } : item));
    };

    const groupedItems = useMemo(() => {
        return items.reduce((acc, item) => {
            if (item.isHeader) {
                acc.push({ title: item.key, items: [] });
            } else if (acc.length > 0 && item.key) {
                acc[acc.length - 1].items.push(item);
            }
            return acc;
        }, [] as { title: string; items: UiTextItem[] }[]);
    }, [items]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return groupedItems.find(g => g.title === activeGroup)?.items || [];
        return items.filter(item => !item.isHeader && (item.key.toLowerCase().includes(searchTerm.toLowerCase()) || item.value.toLowerCase().includes(searchTerm.toLowerCase())));
    }, [searchTerm, items, groupedItems, activeGroup]);
    
    if (loading) return <div className="p-8"><i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...</div>;
    if (error) return <div className="p-8 text-red-600">エラー: {error}</div>;

    return (
        <div className="flex h-screen bg-gray-100 font-sans relative">
            {isLocked && <LockedOverlay />}
            <div className="w-80 flex-shrink-0 bg-white border-r flex flex-col">
                <div className="p-4 border-b">
                    <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="キーまたは値を検索..." className="w-full p-2 border rounded-md" />
                </div>
                <nav className="flex-grow overflow-y-auto">
                    {groupedItems.map(group => (
                        <button key={group.title} onClick={() => { setActiveGroup(group.title); setSearchTerm(''); }} className={`w-full text-left p-4 text-sm font-semibold transition-colors ${activeGroup === group.title && !searchTerm ? 'bg-secondary/10 text-secondary' : 'text-gray-600 hover:bg-gray-50'}`}>
                           {group.title.split('. ')[1]}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 flex flex-col">
                <header className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-bold">{searchTerm ? '検索結果' : activeGroup.split('. ')[1]}</h2>
                    <button onClick={handleSave} disabled={saving || !isDirty} className="bg-secondary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors disabled:bg-gray-400 enabled:hover:bg-indigo-700">
                        {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>保存中...</> : '変更を保存'}
                    </button>
                </header>
                {saveStatus !== 'idle' && (
                    <div className={`p-2 text-sm text-center ${saveStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {saveStatus === 'success' ? '正常に保存されました。' : `保存に失敗しました: ${error}`}
                    </div>
                )}
                <main className="flex-grow overflow-y-auto p-6 space-y-4">
                    {filteredItems.map(item => (
                        <div key={item.key} className="bg-white p-4 border rounded-md">
                            <label htmlFor={item.key} className="block text-sm font-medium text-gray-500 font-mono">{item.key}</label>
                            <textarea
                                id={item.key}
                                value={item.value}
                                onChange={e => handleValueChange(item.key, e.target.value)}
                                rows={item.value.length > 80 ? 3 : 1}
                                className="w-full mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary"
                            />
                        </div>
                    ))}
                     {filteredItems.length === 0 && <p className="text-center text-gray-500 mt-8">項目が見つかりません。</p>}
                </main>
            </div>
        </div>
    );
};

export default UiTextEditor;