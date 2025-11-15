
import React, { useEffect, useMemo, useState } from 'react';
import { EmailTemplate } from '../types';
import { Database, Row } from '@shared/types';
import { generateEmailTemplate } from '@shared/services/geminiService';
import { PlusIcon, SparklesIcon, SpinnerIcon, TrashIcon, XMarkIcon } from '@components/atoms';

const AIGenerateTemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => void;
    isGenerating: boolean;
    aiError: string | null;
}> = ({ isOpen, onClose, onGenerate, isGenerating, aiError }) => {
    const [prompt, setPrompt] = useState('');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">AIで定型文を生成</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="p-6 space-y-4">
                    {aiError && <p className="text-red-500 text-sm bg-red-100 p-2 rounded">{aiError}</p>}
                    <div>
                        <label className="block text-sm font-medium mb-1">どのような内容の定型文を作成しますか？</label>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full p-2 border rounded" placeholder="例: 入金確認と製作開始を伝える丁寧なメール"/>
                    </div>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded bg-gray-200">キャンセル</button>
                    <button onClick={() => onGenerate(prompt)} disabled={isGenerating || !prompt.trim()} className="px-4 py-2 text-sm rounded bg-brand-primary text-white flex items-center gap-2 disabled:bg-gray-400">
                        {isGenerating ? <SpinnerIcon/> : <SparklesIcon/>}
                        {isGenerating ? '生成中...' : '生成'}
                    </button>
                </footer>
            </div>
        </div>
    );
};


interface AIEmailSettingsToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const AIEmailSettingsTool: React.FC<AIEmailSettingsToolProps> = ({ database, setDatabase }) => {
    const [triageEnabled, setTriageEnabled] = useState(true);
    const [priorityKeywords, setPriorityKeywords] = useState('');
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);

    const [modalState, setModalState] = useState<{ isOpen: boolean; targetTemplateId: string | null }>({ isOpen: false, targetTemplateId: null });
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    
    const signature = useMemo(() => {
        const settingsMap = new Map(database.email_general_settings?.data.map(s => [s.key, s.value]));
        return settingsMap.get('signature_default') || '';
    }, [database.email_general_settings]);

    const replyTone = useMemo(() => {
        const settingsMap = new Map(database.ai_settings?.data.map(s => [s.key, s.value]));
        return settingsMap.get('REPLY_TONE') || 'polite';
    }, [database.ai_settings]);


    useEffect(() => {
        const settingsTable = database.ai_settings?.data || [];
        const settingsMap = new Map(settingsTable.map(s => [s.key, s.value]));
        
        setTriageEnabled(settingsMap.get('TRIAGE_ENABLED') === 'true');
        // FIX: Cast value from settingsMap to string to satisfy state setter type.
        setPriorityKeywords(String(settingsMap.get('TRIAGE_PRIORITY_KEYWORDS') || ''));
        setTemplates((database.email_templates?.data as EmailTemplate[]) || []);
    }, [database]);
    
    const handleSave = () => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            const updateOrCreate = (key: string, value: any) => {
                const settingIndex = newDb.ai_settings.data.findIndex((s:Row) => s.key === key);
                if (settingIndex > -1) {
                    newDb.ai_settings.data[settingIndex].value = String(value);
                } else {
                    newDb.ai_settings.data.push({ key, value: String(value) });
                }
            };

            updateOrCreate('TRIAGE_ENABLED', triageEnabled);
            updateOrCreate('TRIAGE_PRIORITY_KEYWORDS', priorityKeywords);
            
            newDb.email_templates.data = templates;

            return newDb;
        });
        alert('AI設定を保存しました。');
    };
    
    const handleTemplateChange = (id: string, field: 'title' | 'content', value: string) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const addTemplate = () => {
        setTemplates(prev => [...prev, { id: `tpl_${Date.now()}`, title: '新しい定型文', content: '' }]);
    };

    const removeTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    const handleGenerateClick = (templateId: string) => {
        setModalState({ isOpen: true, targetTemplateId: templateId });
    };

    const handleAiGeneration = async (prompt: string) => {
        if (!modalState.targetTemplateId) return;

        setIsAiGenerating(true);
        setAiError(null);
        try {
            // FIX: Cast the value to string to ensure type safety.
            const signature = (database.email_settings?.data.find(s => s.key === 'signature_default')?.value as string) || '';
            // FIX: Cast the value to string to ensure type safety.
            const tone = (database.ai_settings?.data.find(s => s.key === 'REPLY_TONE')?.value as string) || 'polite';
            const result = await generateEmailTemplate(prompt, signature, tone);
            handleTemplateChange(modalState.targetTemplateId, 'content', result.content);
            setModalState({ isOpen: false, targetTemplateId: null });
        } catch (e) {
            setAiError(e instanceof Error ? e.message : '生成に失敗しました。');
        } finally {
            setIsAiGenerating(false);
        }
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">AIメール設定</h1>
                        <p className="text-gray-500 mt-1">メールの自動解析や返信文生成など、AIアシスタントの動作をカスタマイズします。</p>
                    </div>
                    <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-800">保存</button>
                </header>

                <div className="flex-grow overflow-y-auto space-y-6 pr-4">
                    <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">AIトリアージ設定</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">優先度が高いキーワード</label>
                                <textarea value={priorityKeywords} onChange={e => setPriorityKeywords(e.target.value)} rows={2} className="w-full p-2 border rounded" placeholder="例: 至急, クレーム, 納期遅れ, 緊急 (カンマ区切り)"/>
                            </div>
                        </div>
                    </div>

                    <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">定型文管理</h2>
                        <div className="space-y-3">
                            {templates.map(template => (
                                <div key={template.id} className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <input type="text" value={template.title} onChange={e => handleTemplateChange(template.id, 'title', e.target.value)} className="font-semibold bg-transparent border-b w-full"/>
                                        <button onClick={() => removeTemplate(template.id)} className="text-red-500 ml-2"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                    <textarea value={template.content} onChange={e => handleTemplateChange(template.id, 'content', e.target.value)} rows={4} className="w-full p-2 border rounded text-xs"/>
                                    <div className="text-right mt-2">
                                        <button onClick={() => handleGenerateClick(template.id)} className="flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200">
                                            <SparklesIcon className="w-4 h-4" /> AIで内容を生成
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addTemplate} className="mt-4 text-sm text-blue-600 flex items-center gap-1"><PlusIcon className="w-4 h-4"/>定型文を追加</button>
                    </div>
                </div>
            </div>
            <AIGenerateTemplateModal 
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, targetTemplateId: null })}
                onGenerate={handleAiGeneration}
                isGenerating={isAiGenerating}
                aiError={aiError}
            />
        </>
    );
};

export default AIEmailSettingsTool;
