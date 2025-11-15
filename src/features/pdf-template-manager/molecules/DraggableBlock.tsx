import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, PdfTemplateBlock, PdfItemGroupConfig } from '@shared/types';
import { Bars2Icon, LockClosedIcon, LockOpenIcon, XMarkIcon } from '@components/atoms';

interface DraggableBlockProps {
    block: PdfTemplateBlock;
    index: number;
    onUpdate: (block: PdfTemplateBlock) => void;
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    isDragging: boolean;
    database: Database;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ block, index, onUpdate, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, isDragging, database }) => {
    const { t } = useTranslation('pdf-template-manager');
    const handleConfigChange = (key: string, value: any) => {
        onUpdate({ ...block, config: { ...block.config, [key]: value } });
    };
    
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>, field: 'width' | 'height') => {
        if (isLocked) return;
        e.preventDefault();
        e.stopPropagation();
        const currentValue = block.config[field] || (field === 'width' ? 100 : 20);
        const delta = e.deltaY > 0 ? -10 : 10;
        let newValue;
        if (field === 'width') {
             newValue = Math.max(10, Math.min(100, currentValue + delta));
        } else {
             newValue = Math.max(5, Math.min(200, currentValue + delta));
        }
        handleConfigChange(field, newValue);
    };

    const typeLabels: Record<string, string> = {
        HEADER: t('pdf_template.block_header', 'ヘッダー'),
        INFO: t('pdf_template.block_info', '情報欄'),
        TOTALS_HEADER: t('pdf_template.block_totals_header', '合計金額ヘッダー'),
        ITEMS: t('pdf_template.block_items', '明細表'),
        GROUPED_ITEMS: t('pdf_template.block_grouped_items', 'グループ化明細'),
        SUMMARY: t('pdf_template.block_summary', '小計・合計欄'),
        NOTES: t('pdf_template.block_notes', '備考欄'),
        BANK_INFO: t('pdf_template.block_bank_info', '振込先情報'),
        STAMP: t('pdf_template.block_stamp', '捺印欄'),
        RECIPIENT_INFO: t('pdf_template.block_recipient_info', '宛名情報'),
        SENDER_INFO: t('pdf_template.block_sender_info', '差出人情報'),
        CUSTOM_TEXT: t('pdf_template.block_custom_text', 'カスタムテキスト'),
        DATA_FIELD: t('pdf_template.block_data_field', 'DB項目'),
        PAGE_BREAK: t('pdf_template.block_page_break', '改ページ'),
        PAGE_NUMBER: t('pdf_template.block_page_number', 'ページ番号'),
        SPACER: t('pdf_template.block_spacer', 'スペース'),
        DESIGN_INFO: t('pdf_template.block_design_info', 'デザイン情報')
    };

    const isLocked = block.config.isLocked || false;
    const width = block.config.width || 100;
    const startNewRow = block.config.startNewRow === undefined ? true : block.config.startNewRow;
    const align = block.config.align || 'left';
    const itemGroupConfigs = (database.pdf_item_display_configs?.data as PdfItemGroupConfig[]) || [];


    if (block.type === 'PAGE_BREAK') {
        return (
             <div
                onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop}
                className={`relative flex items-center justify-between p-2 bg-base-200 dark:bg-base-dark-300 rounded-md border-2 border-dashed border-base-300 dark:border-base-dark-300 ${isDragging ? 'opacity-30' : ''}`}
             >
                <div draggable className="cursor-grab p-1"><Bars2Icon className="w-5 h-5 text-gray-400"/></div>
                <span className="text-sm font-semibold text-gray-500">{t('pdf_template.page_break', '--- 改ページ ---')}</span>
                <button onClick={() => onDelete(block.id)} className="p-0.5 text-red-500 hover:bg-red-100 rounded-full"><XMarkIcon className="w-4 h-4"/></button>
            </div>
        );
    }
    
    return (
        <div
            onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
            className={`relative p-3 bg-base-200 dark:bg-base-dark-300 rounded-md border border-base-300 dark:border-base-dark-300 transition-opacity ${isDragging ? 'opacity-30' : ''}`}
        >
            <div className="flex items-start gap-2">
                 <div className="flex flex-col items-center flex-shrink-0">
                    <div draggable onDragStart={onDragStart} className="cursor-grab p-1 -ml-1">
                        <Bars2Icon className="w-5 h-5 text-gray-400"/>
                    </div>
                    <button onClick={() => handleConfigChange('isLocked', !isLocked)} className="p-1" title={isLocked ? t('pdf_template.unlock_settings', '設定のロックを解除') : t('pdf_template.lock_settings', '設定をロック')}>
                        {isLocked ? <LockClosedIcon className="w-4 h-4 text-yellow-600"/> : <LockOpenIcon className="w-4 h-4 text-gray-400"/>}
                    </button>
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{t('pdf_template.block_label', 'ブロック {index}').replace('{index}', String(index + 1))}: {typeLabels[block.type] || block.type}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={block.enabled} onChange={e => onUpdate({ ...block, enabled: e.target.checked })} className="form-checkbox h-4 w-4 text-brand-secondary" />
                            <button onClick={() => onDelete(block.id)} className="p-0.5 text-red-500 hover:bg-red-100 rounded-full z-10"><XMarkIcon className="w-4 h-4"/></button>
                        </div>
                    </div>

                    <div className={`space-y-2 ${isLocked ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 text-xs">
                            <label className="flex-shrink-0">{t('pdf_template.width', '幅:')}</label>
                            <input type="range" min="10" max="100" step="10" value={width} onChange={e => handleConfigChange('width', parseInt(e.target.value, 10))} onWheel={(e) => handleWheel(e, 'width')} className="w-full" title={t('pdf_template.adjust_width', '幅を調整')} disabled={isLocked}/>
                            <span className="w-8 text-right">{width}%</span>
                        </div>
                         {block.type === 'SPACER' && (
                            <div className="flex items-center gap-2 text-xs">
                                <label className="flex-shrink-0">{t('pdf_template.height', '高さ:')}</label>
                                <input type="range" min="5" max="200" step="5" value={block.config.height || 20} onChange={e => handleConfigChange('height', parseInt(e.target.value, 10))} onWheel={(e) => handleWheel(e, 'height')} className="w-full" title={t('pdf_template.adjust_height', '高さを調整')} disabled={isLocked}/>
                                <span className="w-12 text-right">{block.config.height || 20}px</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center gap-1 cursor-pointer" title={t('pdf_template.new_line_desc', 'このブロックから新しい行を開始する')}><input type="checkbox" checked={startNewRow} onChange={e => handleConfigChange('startNewRow', e.target.checked)} className="form-checkbox h-3 w-3" disabled={isLocked}/> {t('pdf_template.new_line', '改行')}</label>
                            <div className="flex items-center gap-1 p-0.5 bg-base-100 dark:bg-base-dark-200 rounded">
                                <button onClick={() => handleConfigChange('align', 'left')} className={`px-1 rounded text-gray-500 ${align === 'left' ? 'bg-brand-secondary text-white' : ''}`} title={t('pdf_template.align_left', '左寄せ')} disabled={isLocked}><i className="fas fa-align-left"></i></button>
                                <button onClick={() => handleConfigChange('align', 'center')} className={`px-1 rounded text-gray-500 ${align === 'center' ? 'bg-brand-secondary text-white' : ''}`} title={t('pdf_template.align_center', '中央寄せ')} disabled={isLocked}><i className="fas fa-align-center"></i></button>
                                <button onClick={() => handleConfigChange('align', 'right')} className={`px-1 rounded text-gray-500 ${align === 'right' ? 'bg-brand-secondary text-white' : ''}`} title={t('pdf_template.align_right', '右寄せ')} disabled={isLocked}><i className="fas fa-align-right"></i></button>
                            </div>
                        </div>
                         <div className="text-xs space-y-1 pt-2 border-t mt-2 border-base-300 dark:border-base-dark-300">
                            <label className="flex items-center gap-1 cursor-pointer" title={t('pdf_template.fixed_header_desc', 'ヘッダーとして、すべてのページの先頭にこのブロックを表示します。')}>
                                <input type="checkbox" checked={block.config.fixedToTop || false} onChange={e => handleConfigChange('fixedToTop', e.target.checked)} disabled={isLocked} className="form-checkbox h-3 w-3" />
                                {t('pdf_template.fixed_header', 'ヘッダーとして固定 (全ページ)')}
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer" title={t('pdf_template.fixed_footer_desc', 'フッターとして、最終ページの下部にこのブロックを表示します。')}>
                                <input type="checkbox" checked={block.config.fixedToBottom || false} onChange={e => handleConfigChange('fixedToBottom', e.target.checked)} disabled={isLocked} className="form-checkbox h-3 w-3" />
                                {t('pdf_template.fixed_footer', 'フッターとして固定 (最終ページ)')}
                            </label>
                        </div>
                    </div>

                    {block.type === 'HEADER' && (
                        <div className={`mt-2 ${!block.enabled || isLocked ? 'opacity-50' : ''}`}>
                            <label className="text-xs">{t('pdf_template.title_label', 'タイトル')}</label>
                            <input type="text" value={block.config.title || ''} onChange={e => handleConfigChange('title', e.target.value)} className="w-full bg-base-100 dark:bg-base-dark-200 p-1 border rounded text-sm" disabled={!block.enabled || isLocked}/>
                        </div>
                    )}
                     {block.type === 'CUSTOM_TEXT' && (
                        <div className={`mt-2 ${!block.enabled || isLocked ? 'opacity-50' : ''}`}>
                            <label className="text-xs">{t('pdf_template.content_label', 'テキスト内容')}</label>
                            <textarea value={block.config.content || ''} onChange={e => handleConfigChange('content', e.target.value)} className="w-full bg-base-100 dark:bg-base-dark-200 p-1 border rounded text-sm" rows={3} disabled={!block.enabled || isLocked}/>
                        </div>
                    )}
                     {block.type === 'DATA_FIELD' && (
                        <div className="text-xs p-1 mt-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                            <p><strong>{t('pdf_template.db_field', 'DB項目:')}</strong> {block.config.label}</p>
                            <p><strong>{t('pdf_template.sample_value', 'サンプル値:')}</strong> {database[block.config.tableName]?.data[0]?.[block.config.fieldName] || t('pdf_template.no_data', '(データなし)')}</p>
                        </div>
                    )}
                    {block.type === 'SPACER' && (
                        <div className="mt-2 border-2 border-dashed border-gray-400 h-8 flex items-center justify-center text-gray-500 text-xs">
                            {t('pdf_template.space', 'スペース ({width}% × {height}px)').replace('{width}', String(width)).replace('{height}', String(block.config.height || 20))}
                        </div>
                    )}
                     {block.type === 'GROUPED_ITEMS' && (
                        <div className={`mt-2 ${!block.enabled || isLocked ? 'opacity-50' : ''}`}>
                            <label className="text-xs">{t('pdf_template.items_display', '明細表示設定')}</label>
                            <select value={block.config.itemConfigId || ''} onChange={e => handleConfigChange('itemConfigId', e.target.value)} className="w-full bg-base-100 dark:bg-base-dark-200 p-1 border rounded text-sm" disabled={!block.enabled || isLocked}>
                                <option value="">{t('pdf_template.default_display', 'デフォルト表示')}</option>
                                {itemGroupConfigs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DraggableBlock;
