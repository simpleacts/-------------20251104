

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { useHistoryState } from '@shared/hooks/useHistoryState';
import { analyzeDocumentLayout, generateDocumentLayouts } from '@shared/services/geminiService';
import { Database, ImageFile, PdfTemplate, PdfTemplateBlock, Row } from '@shared/types';
import { ArrowUturnLeftIcon, ArrowUturnRightIcon } from '@components/atoms';

import AiLayoutModal from '../modals/AiLayoutModal';
import DataFieldSelectionModal from '../modals/DataFieldSelectionModal';
import LayoutBuilder from '../organisms/LayoutBuilder';
import PdfPreview from '../organisms/PdfPreview';
import SettingsPanel from '../organisms/SettingsPanel';


interface PdfTemplateManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

interface LayoutState {
    blocks: PdfTemplateBlock[];
    margins: { top: number; right: number; bottom: number; left: number };
    initialZoomConfig: { pc: number; tablet: number; mobile: number; embedded: number };
    modalWidthVw: number;
    alignment: string;
    fontFamily: string;
}

const PdfTemplateManager: React.FC<PdfTemplateManagerProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('pdf-template-manager');
    const { currentPage } = useNavigation();
    const [templates, setTemplates] = useState<PdfTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<PdfTemplate | null>(null);
    
    const [
        layoutState, 
        setLayoutState, 
        undo, 
        redo, 
        canUndo, 
        canRedo, 
        resetLayoutState
    ] = useHistoryState<LayoutState>({
        blocks: [],
        margins: { top: 20, right: 15, bottom: 20, left: 15 },
        initialZoomConfig: { pc: 80, tablet: 80, mobile: 80, embedded: 90 },
        modalWidthVw: 75,
        alignment: 'justify-center items-start',
        fontFamily: 'font-sans',
    });

    const { blocks, margins, initialZoomConfig, modalWidthVw, alignment, fontFamily } = layoutState;

    const [isMultiPageSim, setIsMultiPageSim] = useState(false);
    const [isDataFieldModalOpen, setIsDataFieldModalOpen] = useState(false);
    const [isAiLayoutModalOpen, setIsAiLayoutModalOpen] = useState(false);
    const [aiLayouts, setAiLayouts] = useState<PdfTemplateBlock[][]>([]);
    const [isGeneratingLayouts, setIsGeneratingLayouts] = useState(false);
    const [activeTab, setActiveTab] = useState<'layout' | 'settings'>('layout');

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [draggingNewBlockType, setDraggingNewBlockType] = useState<PdfTemplateBlock['type'] | null>(null);

    useEffect(() => {
        const dbTemplates = (database.pdf_templates?.data as PdfTemplate[]) || [];
        setTemplates(dbTemplates);
        if (!selectedTemplate && dbTemplates.length > 0) {
            setSelectedTemplate(dbTemplates[0]);
        }
    }, [database.pdf_templates, selectedTemplate]);
    
    useEffect(() => {
        if (selectedTemplate?.config_json) {
            try {
                const config = JSON.parse(selectedTemplate.config_json);
                resetLayoutState({
                    blocks: config.blocks || [],
                    margins: config.margins || { top: 20, right: 15, bottom: 20, left: 15 },
                    initialZoomConfig: config.initialZoomConfig || { pc: 80, tablet: 80, mobile: 80, embedded: 90 },
                    modalWidthVw: config.modalWidthVw || 75,
                    alignment: config.alignment || 'justify-center items-start',
                    fontFamily: config.fontFamily || 'font-sans',
                });
            } catch (e) {
                console.error("Failed to parse template config JSON", e);
            }
        } else if (selectedTemplate) { // Handle case where template exists but has no config
             resetLayoutState({
                blocks: [],
                margins: { top: 20, right: 15, bottom: 20, left: 15 },
                initialZoomConfig: { pc: 80, tablet: 80, mobile: 80, embedded: 90 },
                modalWidthVw: 75,
                alignment: 'justify-center items-start',
                fontFamily: 'font-sans',
            });
        }
    }, [selectedTemplate, resetLayoutState]);

    const handleSaveTemplate = async () => {
        if (!selectedTemplate) return;
        const newConfig = JSON.stringify({ blocks, margins, initialZoomConfig, modalWidthVw, alignment, fontFamily });
        const updatedTemplate = { ...selectedTemplate, config_json: newConfig };
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const index = newDb.pdf_templates.data.findIndex((t: Row) => t.id === selectedTemplate.id);
            if (index > -1) {
                newDb.pdf_templates.data[index] = updatedTemplate;
            }
            return newDb;
        });
        setSelectedTemplate(updatedTemplate);

        // サーバーに保存
        try {
            const result = await updateDatabase(
                currentPage,
                'pdf_templates',
                [{ type: 'UPDATE' as const, data: updatedTemplate, where: { id: selectedTemplate.id } }],
                database
            );
            if (!result.success) {
                throw new Error(result.error || 'Failed to save template to server');
            }
            alert(t('pdf_template.save_success', 'テンプレートを保存しました。'));
        } catch (error) {
            console.error('[PdfTemplateManager] Failed to save template to server:', error);
            alert(t('pdf_template.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const addBlock = useCallback((type: PdfTemplateBlock['type'], index?: number) => {
        const newBlock: PdfTemplateBlock = {
            id: `${type.toLowerCase()}_${Date.now()}`,
            type: type,
            enabled: true,
            config: { width: 100, startNewRow: true, align: 'left' }
        };
        if (type === 'HEADER') newBlock.config.title = t('pdf_template.new_title', '新しいタイトル');
        if (type === 'SPACER') newBlock.config.height = 20;

        setLayoutState(prev => {
            const newBlocks = [...prev.blocks];
            if (index !== undefined) {
                newBlocks.splice(index, 0, newBlock);
            } else {
                newBlocks.push(newBlock);
            }
            return { ...prev, blocks: newBlocks };
        });
    }, [setLayoutState]);
    
    const handleAddDataField = (selection: { tableName: string; fieldName: string, label: string }) => {
        const newBlock: PdfTemplateBlock = {
            id: `data_field_${Date.now()}`, type: 'DATA_FIELD', enabled: true,
            config: { ...selection, width: 100, startNewRow: true, align: 'left' },
        };
        setLayoutState(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    };

    const updateBlock = useCallback((updatedBlock: PdfTemplateBlock) => {
        setLayoutState(prev => ({ ...prev, blocks: prev.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b) }));
    }, [setLayoutState]);

    const deleteBlock = useCallback((id: string) => {
        setLayoutState(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) }));
    }, [setLayoutState]);
    
    const handleAnalyzeLayout = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsGeneratingLayouts(true);
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const base64Data = (event.target?.result as string).split(',')[1];
                const imageFile: ImageFile = { name: file.name, type: file.type, base64Data };
                const analyzedBlocks = await analyzeDocumentLayout(imageFile);
                setLayoutState(prev => ({ ...prev, blocks: analyzedBlocks }));
            } catch (error) {
                alert(t('pdf_template.layout_analyze_failed', 'レイアウトの解析に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            } finally {
                setIsGeneratingLayouts(false);
                if (e.target) e.target.value = '';
            }
        };

        reader.readAsDataURL(file);
    };
    
    const handleGenerateLayouts = async (prompt: string) => {
        if (!prompt.trim()) return;
        setIsGeneratingLayouts(true);
        try {
            const layouts = await generateDocumentLayouts(prompt);
            setAiLayouts(layouts);
            setIsAiLayoutModalOpen(true);
        } catch (error) {
             alert(t('pdf_template.layout_generate_failed', 'レイアウトの生成に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsGeneratingLayouts(false);
        }
    };
    
    const onAiLayoutSelect = useCallback((newBlocks: PdfTemplateBlock[]) => {
        setLayoutState(prev => ({ ...prev, blocks: newBlocks }));
        setIsAiLayoutModalOpen(false);
    }, [setLayoutState]);

    const handleDragStart = (e: React.DragEvent, id: string) => { setDraggingId(id); e.dataTransfer.effectAllowed = 'move'; };
    // FIX: Fix the 'Cannot find name' error by correcting the function name to 'handleDragStartNewBlock' to match the call site. Although the error was reported for this file, the fix is likely in the child component that receives this prop. For consistency, and to address the provided error message's suggestion, we align the names.
    const handleDragStartNewBlock = (e: React.DragEvent, type: PdfTemplateBlock['type']) => { setDraggingNewBlockType(type); e.dataTransfer.effectAllowed = 'copy'; };
    const handleDragEnd = () => { setDraggingId(null); setDraggingNewBlockType(null); };
    
    const handleDropOnBlock = (dropId: string) => {
        if (draggingId) { // Reordering existing block
            if (draggingId === dropId) return;
            const dragIndex = blocks.findIndex(b => b.id === draggingId);
            const dropIndex = blocks.findIndex(b => b.id === dropId);
            if (dragIndex > -1 && dropIndex > -1) {
                setLayoutState(prev => {
                    const newBlocks = [...prev.blocks];
                    const [draggedItem] = newBlocks.splice(dragIndex, 1);
                    newBlocks.splice(dropIndex, 0, draggedItem);
                    return { ...prev, blocks: newBlocks };
                });
            }
        } else if (draggingNewBlockType) { // Adding new block
            const dropIndex = blocks.findIndex(b => b.id === dropId);
            addBlock(draggingNewBlockType, dropIndex);
        }
    };
    const handleDropOnListEnd = () => {
        if (draggingNewBlockType) addBlock(draggingNewBlockType);
    };
    
    const onFontFamilyChange = useCallback((font: string) => setLayoutState(prev => ({...prev, fontFamily: font})), [setLayoutState]);
    const onZoomConfigChange = useCallback((device: 'pc' | 'tablet' | 'mobile' | 'embedded', value: number) => setLayoutState(prev => ({...prev, initialZoomConfig: {...prev.initialZoomConfig, [device]: value}})), [setLayoutState]);
    const onAlignmentChange = useCallback((align: string) => setLayoutState(prev => ({...prev, alignment: align})), [setLayoutState]);
    const onModalWidthChange = useCallback((width: number) => setLayoutState(prev => ({...prev, modalWidthVw: width})), [setLayoutState]);

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t('pdf_template.title', 'PDFテンプレート管理')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={undo} disabled={!canUndo} className="p-2 rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark disabled:opacity-50" title={t('pdf_template.undo', '元に戻す (Ctrl+Z)')}>
                        <ArrowUturnLeftIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={redo} disabled={!canRedo} className="p-2 rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark disabled:opacity-50" title={t('pdf_template.redo', 'やり直す (Ctrl+Y)')}>
                        <ArrowUturnRightIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={handleSaveTemplate} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg">{t('pdf_template.save', '保存')}</button>
                </div>
            </header>
            <div className="grid grid-cols-12 gap-6 flex-grow min-h-0">
                <aside className="col-span-4 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                    <div className="border-b border-base-300 dark:border-base-dark-300 mb-4">
                        <div className="flex space-x-4">
                            <button onClick={() => setActiveTab('layout')} className={`py-2 text-sm font-medium border-b-2 ${activeTab === 'layout' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>{t('pdf_template.tab_layout', 'レイアウト')}</button>
                            <button onClick={() => setActiveTab('settings')} className={`py-2 text-sm font-medium border-b-2 ${activeTab === 'settings' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>{t('pdf_template.tab_settings', '設定')}</button>
                        </div>
                    </div>

                    {activeTab === 'layout' ? (
                        <LayoutBuilder 
                            blocks={blocks}
                            onUpdateBlock={updateBlock}
                            onDeleteBlock={deleteBlock}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDropOnListEnd={handleDropOnListEnd}
                            onDropOnBlock={handleDropOnBlock}
                            draggingId={draggingId}
                            onDragStartNewBlock={handleDragStartNewBlock}
                            isGeneratingLayouts={isGeneratingLayouts}
                            // FIX: Corrected prop names to match the function definitions.
                            onAnalyzeLayout={handleAnalyzeLayout}
                            // FIX: Corrected prop names to match the function definitions.
                            onGenerateLayouts={handleGenerateLayouts}
                            onAddDataFieldClick={() => setIsDataFieldModalOpen(true)}
                            database={database}
                        />
                    ) : (
                        <SettingsPanel 
                            fontFamily={fontFamily}
                            onFontFamilyChange={onFontFamilyChange}
                            initialZoomConfig={initialZoomConfig}
                            onZoomConfigChange={onZoomConfigChange}
                            alignment={alignment}
                            onAlignmentChange={onAlignmentChange}
                            modalWidthVw={modalWidthVw}
                            onModalWidthChange={onModalWidthChange}
                        />
                    )}
                </aside>
                <main className="col-span-8 flex flex-col min-h-0">
                     <div className="flex-shrink-0 flex justify-between items-center mb-4">
                        <select id="pdf-template-select" name="pdf_template_id" value={selectedTemplate?.id || ''} onChange={e => setSelectedTemplate(templates.find(t => t.id === e.target.value) || null)} className="p-2 border rounded bg-base-100 dark:bg-base-dark-200" aria-label={t('pdf_template.select_template', 'PDFテンプレートを選択')}>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                             <label htmlFor="multi-page-sim-checkbox" className="text-sm flex items-center gap-2"><input id="multi-page-sim-checkbox" name="multi_page_sim" type="checkbox" checked={isMultiPageSim} onChange={e => setIsMultiPageSim(e.target.checked)} />{t('pdf_template.multi_page_sim', '複数ページをシミュレート')}</label>
                        </div>
                    </div>
                    <div className="flex-grow bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-inner overflow-hidden flex flex-col">
                        {selectedTemplate && <PdfPreview blocks={blocks} database={database} documentType={selectedTemplate.type} margins={margins} isMultiPageSim={isMultiPageSim} initialZoomConfig={initialZoomConfig} alignment={alignment} fontFamily={fontFamily} />}
                    </div>
                </main>
            </div>
            {isDataFieldModalOpen && <DataFieldSelectionModal isOpen={isDataFieldModalOpen} onClose={() => setIsDataFieldModalOpen(false)} onSelect={handleAddDataField} database={database} />}
            {isAiLayoutModalOpen && <AiLayoutModal isOpen={isAiLayoutModalOpen} onClose={() => setIsAiLayoutModalOpen(false)} layouts={aiLayouts} onSelect={onAiLayoutSelect} database={database} />}
        </div>
    );
};

export default PdfTemplateManager;