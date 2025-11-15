import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, FilePreview, Row, Rule, RuleType } from '@shared/types';
import { Bars2Icon, DownloadIcon, SpinnerIcon, TrashIcon } from '@components/atoms';

declare const JSZip: any;

interface ImageFileNameConverterProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot);
};

const getFileNameWithoutExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return filename;
    return filename.substring(0, lastDot);
};

const RuleEditor: React.FC<{
    rule: Rule;
    onUpdate: (rule: Rule) => void;
    onRemove: (id: string) => void;
    isDragging: boolean;
    isDropTarget: boolean;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: () => void;
}> = ({ rule, onUpdate, onRemove, isDragging, isDropTarget, onDragStart, onDragEnd, onDragOver, onDrop }) => {
    const { t } = useTranslation('image-file-name-converter');
    const updateParam = (param: string, value: any) => {
        onUpdate({ ...rule, params: { ...rule.params, [param]: value } });
    };

    const renderParams = () => {
        switch (rule.type) {
            case 'replace':
                return (
                    <div className="space-y-2">
                        <input type="text" placeholder={t('file_converter.search_string', '検索する文字列')} value={rule.params.search || ''} onChange={e => updateParam('search', e.target.value)} className="w-full bg-base-100 dark:bg-base-dark-200 p-1 border rounded" />
                        <input type="text" placeholder={t('file_converter.replace_string', '置換後の文字列')} value={rule.params.replace || ''} onChange={e => updateParam('replace', e.target.value)} className="w-full bg-base-100 dark:bg-base-dark-200 p-1 border rounded" />
                        <div className="flex items-center gap-4 text-xs">
                            <label><input type="checkbox" checked={rule.params.useRegex} onChange={e => updateParam('useRegex', e.target.checked)} /> {t('file_converter.use_regex', '正規表現')}</label>
                            <label><input type="checkbox" checked={rule.params.caseSensitive} onChange={e => updateParam('caseSensitive', e.target.checked)} /> {t('file_converter.case_sensitive', '大文字/小文字を区別')}</label>
                        </div>
                    </div>
                );
            case 'prefix':
            case 'suffix':
                return <input type="text" placeholder={t('file_converter.add_text', '追加するテキスト')} value={rule.params.text || ''} onChange={e => updateParam('text', e.target.value)} className="w-full bg-base-100 dark:bg-base-dark-200 p-1 border rounded" />;
            case 'case':
                return (
                     <select value={rule.params.caseType || 'lower'} onChange={e => updateParam('caseType', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark p-1 border rounded">
                        <option value="lower">{t('file_converter.lowercase', 'すべて小文字')}</option>
                        <option value="upper">{t('file_converter.uppercase', 'すべて大文字')}</option>
                        <option value="title">{t('file_converter.title_case', 'タイトルケース')}</option>
                    </select>
                );
            default:
                return null;
        }
    };
    
    const typeLabels: Record<RuleType, string> = {
        replace: t('file_converter.rule_type_replace', 'テキストの置換'),
        prefix: t('file_converter.rule_type_prefix', '接頭辞を追加'),
        suffix: t('file_converter.rule_type_suffix', '接尾辞を追加'),
        case: t('file_converter.rule_type_case', '大文字/小文字の変更'),
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`relative p-3 bg-base-200 dark:bg-base-dark-300 rounded-md border border-base-300 dark:border-base-dark-300 transition-all duration-150 ${isDragging ? 'opacity-30' : ''}`}
        >
            {isDropTarget && <div className="absolute top-0 left-0 right-0 h-1 bg-brand-primary rounded-t-md"></div>}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 cursor-grab">
                    <Bars2Icon className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-sm">{typeLabels[rule.type]}</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={e => onUpdate({ ...rule, enabled: e.target.checked })}
                        className="form-checkbox h-4 w-4 text-brand-secondary rounded focus:ring-brand-secondary"
                    />
                    <button onClick={() => onRemove(rule.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {renderParams()}
        </div>
    );
};


const ImageFileNameConverter: React.FC<ImageFileNameConverterProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('image-file-name-converter');
    const [files, setFiles] = useState<FilePreview[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [newPresetName, setNewPresetName] = useState('');
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [draggingRuleId, setDraggingRuleId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('webkitdirectory', 'true');
        }
    }, []);

    const presets = useMemo(() => database.filename_rule_presets?.data || [], [database.filename_rule_presets]);

    useEffect(() => {
        const selectedPreset = presets.find(p => p.id === selectedPresetId);
        if (selectedPreset && selectedPreset.rules) {
            try {
                setRules(JSON.parse(selectedPreset.rules as string));
            } catch (error) {
                console.error("Failed to parse preset rules", error);
            }
        }
    }, [selectedPresetId, presets]);

    const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setIsProcessingFiles(true);

        const fileList: File[] = Array.from(e.target.files);
        const newFilePreviews: FilePreview[] = fileList.map((file: File) => ({
            originalName: file.name,
            newName: file.name,
            path: (file as any).webkitRelativePath || file.name,
            file,
            selected: true,
        }));

        setFiles(prev => [...prev, ...newFilePreviews]);
        setIsProcessingFiles(false);
        e.target.value = ''; // Reset input
    }, []);

    const processedFiles = useMemo(() => {
        return files.map(file => {
            let newName = getFileNameWithoutExtension(file.originalName);
            const extension = getFileExtension(file.originalName);
            rules.forEach(rule => {
                if (!rule.enabled) return;
                try {
                    switch (rule.type) {
                        case 'replace': {
                            const search = rule.params.search || '';
                            const replace = rule.params.replace || '';
                            if (rule.params.useRegex) {
                                const flags = rule.params.caseSensitive ? 'g' : 'gi';
                                newName = newName.replace(new RegExp(search, flags), replace);
                            } else {
                                if (rule.params.caseSensitive) {
                                    newName = newName.split(search).join(replace);
                                } else {
                                    newName = newName.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replace);
                                }
                            }
                            break;
                        }
                        case 'prefix': newName = `${rule.params.text || ''}${newName}`; break;
                        case 'suffix': newName = `${newName}${rule.params.text || ''}`; break;
                        case 'case':
                            if (rule.params.caseType === 'lower') newName = newName.toLowerCase();
                            else if (rule.params.caseType === 'upper') newName = newName.toUpperCase();
                            else if (rule.params.caseType === 'title') newName = newName.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                            break;
                    }
                } catch (e) {
                    console.error('Error applying rule', rule, e);
                }
            });
            return { ...file, newName: newName + extension };
        });
    }, [files, rules]);

    const handleAddRule = (type: RuleType) => {
        setRules(prev => [...prev, { id: `rule_${Date.now()}`, type, enabled: true, params: {} }]);
    };
    
    const handleUpdateRule = (updatedRule: Rule) => {
        setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
    };

    const handleRemoveRule = (id: string) => {
        setRules(prev => prev.filter(r => r.id !== id));
    };

    const handleDownloadZip = async () => {
        setIsZipping(true);
        try {
            const zip = new JSZip();
            processedFiles.forEach(file => {
                if (file.selected) {
                    const pathParts = file.path.split('/');
                    pathParts[pathParts.length - 1] = file.newName;
                    const newPath = pathParts.join('/');
                    zip.file(newPath, file.file);
                }
            });
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `converted_files_${Date.now()}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to generate zip", error);
            alert(t('file_converter.zip_error', 'ZIPファイルの生成に失敗しました。'));
        } finally {
            setIsZipping(false);
        }
    };
    
    const handleSavePreset = () => {
        if (!newPresetName) {
            alert(t('file_converter.preset_name_required', 'プリセット名を入力してください。'));
            return;
        }
        const newPreset: Row = { id: `preset_${Date.now()}`, name: newPresetName, rules: JSON.stringify(rules) };
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (!newDb.filename_rule_presets) return db;
            newDb.filename_rule_presets.data.push(newPreset);
            return newDb;
        });
        setNewPresetName('');
        setSelectedPresetId(newPreset.id as string);
        alert(t('file_converter.preset_saved', 'プリセットを保存しました。'));
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggingRuleId(id);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragEnd = () => {
        setDraggingRuleId(null);
        setDropTargetId(null);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        e.preventDefault();
        setDropTargetId(id);
    };
    const handleDrop = (dropId: string) => {
        if (!draggingRuleId || draggingRuleId === dropId) return;
        const dragIndex = rules.findIndex(r => r.id === draggingRuleId);
        const dropIndex = rules.findIndex(r => r.id === dropId);
        if (dragIndex > -1 && dropIndex > -1) {
            const newRules = [...rules];
            const [draggedItem] = newRules.splice(dragIndex, 1);
            newRules.splice(dropIndex, 0, draggedItem);
            setRules(newRules);
        }
    };

    return (
        <div className="flex flex-col h-full">
             <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('file_converter.title', 'ファイル名一括変換')}</h1>
                <p className="text-gray-500 mt-1">{t('file_converter.description', '複数の画像ファイル名をルールに基づいて一括で変更し、ZIPファイルとしてダウンロードします。')}</p>
            </header>

            <div className="grid grid-cols-12 gap-6 flex-grow min-h-0">
                <aside className="col-span-4 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                    <h2 className="text-xl font-bold mb-4">{t('file_converter.rename_operations', 'リネーム操作')}</h2>
                    <div className="mb-4">
                        <label className="text-sm font-medium">{t('file_converter.preset', 'プリセット')}</label>
                        <select value={selectedPresetId} onChange={e => setSelectedPresetId(e.target.value)} className="w-full p-2 border rounded mt-1 bg-base-200 dark:bg-base-dark-300">
                            <option value="">{t('file_converter.select_preset', 'プリセットを選択...')}</option>
                            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="flex mt-2">
                             <input type="text" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} placeholder={t('file_converter.new_preset_name', '新規プリセット名')} className="flex-grow p-2 border rounded-l"/>
                             <button onClick={handleSavePreset} className="px-4 bg-blue-600 text-white rounded-r">{t('file_converter.save', '保存')}</button>
                        </div>
                    </div>
                    <div onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(rules[rules.length - 1].id)} className="space-y-3 flex-grow overflow-y-auto pr-2 -mr-2">
                        {rules.map((rule, index) => (
                             <RuleEditor
                                key={rule.id}
                                rule={rule}
                                onUpdate={handleUpdateRule}
                                onRemove={handleRemoveRule}
                                isDragging={draggingRuleId === rule.id}
                                isDropTarget={dropTargetId === rule.id && draggingRuleId !== rule.id}
                                onDragStart={(e) => handleDragStart(e, rule.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, rule.id)}
                                onDrop={() => handleDrop(rule.id)}
                            />
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <h3 className="font-semibold mb-2">{t('file_converter.add_rule', 'ルールを追加')}</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {(['replace', 'prefix', 'suffix', 'case'] as RuleType[]).map(type => (
                                <button key={type} onClick={() => handleAddRule(type)} className="p-2 bg-gray-200 dark:bg-gray-600 rounded text-center">
                                    {({
                                        replace: t('file_converter.rule_replace', '置換'),
                                        prefix: t('file_converter.rule_prefix', '接頭辞'),
                                        suffix: t('file_converter.rule_suffix', '接尾辞'),
                                        case: t('file_converter.rule_case', '大/小文字')
                                    } as Record<string, string>)[type]}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="col-span-8 bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md flex flex-col min-h-0">
                    <div className="p-4 flex-shrink-0">
                        <label htmlFor="file-upload" className="block text-xl font-bold mb-2">{t('file_converter.file_upload', 'ファイルアップロード')}</label>
                        <input ref={fileInputRef} type="file" id="file-upload" multiple onChange={handleFileChange} className="block w-full text-sm"/>
                    </div>
                     <div className="p-4 border-t flex justify-between items-center flex-shrink-0">
                        <h3 className="text-lg font-bold">{t('file_converter.preview', 'プレビュー')} ({processedFiles.length}件)</h3>
                        <button onClick={handleDownloadZip} disabled={isZipping || files.length === 0} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-400">
                           {isZipping ? <SpinnerIcon className="w-5 h-5"/> : <DownloadIcon className="w-5 h-5"/>} {isZipping ? t('file_converter.compressing', '圧縮中...') : t('file_converter.download_zip', 'ZIPダウンロード')}
                        </button>
                    </div>
                    <div className="overflow-auto flex-grow">
                        <table className="min-w-full text-xs">
                            <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                                <tr>
                                    <th className="p-2 w-10 text-center"><input type="checkbox" checked={files.every(f => f.selected)} onChange={e => setFiles(f => f.map(file => ({...file, selected: e.target.checked})))} /></th>
                                    <th className="p-2 text-left">{t('file_converter.original_filename', '元のファイル名')}</th>
                                    <th className="p-2 text-left">{t('file_converter.new_filename', '変換後のファイル名')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedFiles.map((file, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="p-2 text-center"><input type="checkbox" checked={file.selected} onChange={e => setFiles(f => f.map((item, i) => i === index ? {...item, selected: e.target.checked} : item))}/></td>
                                        <td className="p-2 font-mono break-all">{file.originalName}</td>
                                        <td className="p-2 font-mono break-all font-semibold text-blue-700 dark:text-blue-400">{file.newName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default React.memo(ImageFileNameConverter);