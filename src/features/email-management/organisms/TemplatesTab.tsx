import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { generateEmailTemplate } from '@shared/services/geminiService';
import { Database, Row } from '@shared/types';
import { Button, PlusIcon, SparklesIcon, TrashIcon, Input, Textarea } from '@components/atoms';
import { SettingsCard } from '@components/molecules';
import AIGenerateTemplateModal from '../modals/AIGenerateTemplateModal';
import { EmailTemplate } from '../types';

interface TemplatesTabProps {
    database: Database;
    setDatabase: (updater: (db: Database | null) => Database | null) => void;
    isDefaultMode: boolean;
    setHasChanges: (hasChanges: boolean) => void;
}

const TemplatesTab: React.FC<TemplatesTabProps> = ({ database, setDatabase, isDefaultMode, setHasChanges }) => {
    const { currentPage } = useNavigation();
    const initialTemplates = useMemo(() => (database.email_templates?.data as EmailTemplate[]) || [], [database.email_templates]);
    const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
    
    const [modalState, setModalState] = useState<{ isOpen: boolean; targetTemplateId: string | null }>({ isOpen: false, targetTemplateId: null });
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        setTemplates(initialTemplates);
    }, [initialTemplates]);

    const hasChanges = useMemo(() => JSON.stringify(templates) !== JSON.stringify(initialTemplates), [templates, initialTemplates]);

    useEffect(() => {
        setHasChanges(hasChanges);
    }, [hasChanges, setHasChanges]);

    const handleTemplateChange = (id: string, field: 'title' | 'content', value: string) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const addTemplate = () => {
        setTemplates(prev => [...prev, { id: `tpl_${Date.now()}`, title: '新しい定型文', content: '' }]);
    };

    const removeTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            newDb.email_templates.data = templates;
            return newDb;
        });

        // サーバーに保存（全データを置き換え）
        try {
            const existingIds = (database.email_templates?.data || []).map((t: Row) => t.id);
            const operations = [
                ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                ...templates.map(template => ({ type: 'INSERT' as const, data: template }))
            ];

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, 'email_templates', operations, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save email templates to server');
                }
            }
            alert('定型文を保存しました。');
        } catch (error) {
            console.error('[TemplatesTab] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleGenerateClick = (templateId: string) => {
        setModalState({ isOpen: true, targetTemplateId: templateId });
    };

    const handleAiGeneration = async (prompt: string) => {
        if (!modalState.targetTemplateId) return;
        setIsAiGenerating(true);
        setAiError(null);
        try {
            const signature = database.email_settings?.data.find(s => s.key === 'signature_default')?.value || '';
            const tone = database.ai_settings?.data.find(s => s.key === 'REPLY_TONE')?.value || 'polite';
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
        <div className="space-y-6">
            <div className="flex justify-between items-center sticky top-0 py-2 bg-container-bg dark:bg-container-bg-dark z-10">
                 <div className="flex items-center gap-3">
                    {hasChanges && <span className="text-sm text-yellow-600 animate-pulse">未保存の変更があります</span>}
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={addTemplate} disabled={!isDefaultMode}><PlusIcon className="w-4 h-4 mr-2"/>定型文を追加</Button>
                    <Button onClick={handleSave} disabled={!hasChanges || !isDefaultMode}>保存</Button>
                </div>
            </div>
            
            {!isDefaultMode ? (
                 <div className="text-center text-muted dark:text-muted-dark p-8 bg-container-muted-bg rounded-md">
                    定型文は全アカウント共通の設定です。編集するには、アカウントセレクターで「デフォルト（共通）設定」を選択してください。
                </div>
            ) : (
                <SettingsCard title="定型文一覧">
                    <div className="space-y-3">
                        {templates.map(template => (
                            <div key={template.id} className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                    <Input name={`template-title-${template.id}`} value={template.title} onChange={e => handleTemplateChange(template.id, 'title', e.target.value)} className="font-semibold bg-transparent"/>
                                    <Button variant="ghost" size="sm" onClick={() => removeTemplate(template.id)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                                </div>
                                <Textarea name={`template-content-${template.id}`} value={template.content} onChange={e => handleTemplateChange(template.id, 'content', e.target.value)} rows={4}/>
                                <div className="text-right mt-2">
                                    <Button variant="secondary" size="sm" onClick={() => handleGenerateClick(template.id)}><SparklesIcon className="w-4 h-4 mr-1"/> AIで内容を生成</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </SettingsCard>
            )}
            
            <AIGenerateTemplateModal 
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, targetTemplateId: null })}
                onGenerate={handleAiGeneration}
                isGenerating={isAiGenerating}
                aiError={aiError}
            />
        </div>
    );
};

export default TemplatesTab;