import React, { useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, PdfTemplateBlock } from '@shared/types';
import { SparklesIcon, SpinnerIcon, UploadIcon } from '@components/atoms';
import DraggableBlock from '../molecules/DraggableBlock';

interface LayoutBuilderProps {
    blocks: PdfTemplateBlock[];
    onUpdateBlock: (updatedBlock: PdfTemplateBlock) => void;
    onDeleteBlock: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
    onDropOnListEnd: () => void;
    onDropOnBlock: (dropId: string) => void;
    draggingId: string | null;
    onDragStartNewBlock: (e: React.DragEvent, type: PdfTemplateBlock['type']) => void;
    isGeneratingLayouts: boolean;
    onAnalyzeLayout: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGenerateLayouts: (prompt: string) => void;
    onAddDataFieldClick: () => void;
    database: Database;
}

const LayoutBuilder: React.FC<LayoutBuilderProps> = (props) => {
    const {
        blocks, onUpdateBlock, onDeleteBlock, onDragStart, onDragEnd, onDropOnListEnd,
        onDropOnBlock, draggingId, onDragStartNewBlock, isGeneratingLayouts,
        onAnalyzeLayout, onGenerateLayouts, onAddDataFieldClick, database
    } = props;
    const { t } = useTranslation('pdf-template-manager');
    const [aiPrompt, setAiPrompt] = useState('');

    const blockTypes: { type: PdfTemplateBlock['type']; label: string }[] = [
        { type: 'HEADER', label: t('pdf_template.block_header', 'ヘッダー') },
        { type: 'RECIPIENT_INFO', label: t('pdf_template.block_recipient_info', '宛名情報') },
        { type: 'SENDER_INFO', label: t('pdf_template.block_sender_info', '差出人情報') },
        { type: 'INFO', label: t('pdf_template.block_info', '情報欄') },
        { type: 'TOTALS_HEADER', label: t('pdf_template.block_totals_header', '合計金額ヘッダー') },
        { type: 'GROUPED_ITEMS', label: t('pdf_template.block_grouped_items', 'グループ化明細') },
        { type: 'SUMMARY', label: t('pdf_template.block_summary', '小計・合計欄') },
        { type: 'NOTES', label: t('pdf_template.block_notes', '備考欄') },
        { type: 'BANK_INFO', label: t('pdf_template.block_bank_info', '振込先情報') },
        { type: 'STAMP', label: t('pdf_template.block_stamp', '捺印欄') },
        { type: 'CUSTOM_TEXT', label: t('pdf_template.block_custom_text', 'カスタムテキスト') },
        { type: 'SPACER', label: t('pdf_template.block_spacer', 'スペース') },
        { type: 'PAGE_BREAK', label: t('pdf_template.block_page_break', '改ページ') },
        { type: 'PAGE_NUMBER', label: t('pdf_template.block_page_number', 'ページ番号') },
        { type: 'DESIGN_INFO', label: t('pdf_template.block_design_info', 'デザイン情報') }
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h3 className="text-lg font-bold mb-2">{t('pdf_template.add_block', 'ブロックを追加')}</h3>
                <p className="text-xs text-gray-500 mb-2">{t('pdf_template.add_block_desc', '使いたいブロックを下のリストにドラッグ＆ドロップしてください。')}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {blockTypes.map(b => (
                        <button key={b.type} draggable onDragStart={(e) => onDragStartNewBlock(e, b.type)} onDragEnd={onDragEnd} className="bg-gray-200 p-2 rounded hover:bg-gray-300 cursor-grab active:cursor-grabbing">
                            {b.label}
                        </button>
                    ))}
                </div>
                 <button onClick={onAddDataFieldClick} className="w-full mt-2 text-sm bg-blue-100 text-blue-800 py-2 font-bold rounded-lg hover:bg-blue-200">{t('pdf_template.add_data_field', '+ DB項目を追加')}</button>
            </div>

            <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-500"/>{t('pdf_template.ai_layout', 'AIでレイアウト')}</h3>
                <div className="space-y-2">
                    <label htmlFor="ai-layout-upload" className="w-full flex items-center justify-center gap-2 text-sm bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer">
                        <UploadIcon className="w-5 h-5"/> {t('pdf_template.upload_analyze', '見本をアップロードして解析')}
                    </label>
                    <input id="ai-layout-upload" type="file" accept="image/*" onChange={onAnalyzeLayout} className="hidden"/>
                    
                    <div className="flex gap-2">
                        <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder={t('pdf_template.ai_prompt_placeholder', '例：シンプルな請求書')} className="flex-grow p-2 border rounded"/>
                        <button onClick={() => onGenerateLayouts(aiPrompt)} disabled={isGeneratingLayouts || !aiPrompt.trim()} className="px-4 bg-purple-600 text-white rounded disabled:bg-gray-400">
                            {isGeneratingLayouts ? <SpinnerIcon className="w-5 h-5"/> : t('pdf_template.generate', '生成')}
                        </button>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-bold my-4 border-t pt-4">{t('pdf_template.layout_builder', 'レイアウトビルダー')}</h2>
            <div onDragOver={(e) => e.preventDefault()} onDrop={onDropOnListEnd} className="flex-grow overflow-y-auto space-y-3 border-2 border-dashed border-transparent hover:border-brand-secondary/50 p-1 -m-1">
                {blocks.map((block, index) => (
                     <DraggableBlock
                        key={block.id}
                        block={block} index={index}
                        onUpdate={onUpdateBlock} onDelete={onDeleteBlock}
                        onDragStart={(e) => onDragStart(e, block.id)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropOnBlock(block.id)}
                        isDragging={draggingId === block.id}
                        database={database}
                     />
                ))}
                {blocks.length === 0 && <div className="text-center text-sm text-gray-400 p-8">{t('pdf_template.drag_drop_blocks', 'ブロックをドラッグ＆ドロップしてください')}</div>}
            </div>
        </div>
    );
};

export default LayoutBuilder;
