import React, { useMemo } from 'react';
import { Database, PrintDesign, Row } from '@shared/types';
import { EnrichedQuote } from '../types';
import { PaperclipIcon } from '@components/atoms';

interface QuoteCardProps {
    quote: EnrichedQuote;
    database: Partial<Database>;
    onDetailsClick: (quote: EnrichedQuote) => void;
    onDragStart: (e: React.DragEvent, quote: EnrichedQuote) => void;
    onDragEnd: () => void;
}

const QuoteCard: React.FC<QuoteCardProps> = React.memo(({ quote, database, onDetailsClick, onDragStart, onDragEnd }) => {
    
    const totalTasks = quote.tasks?.length || 0;
    const completedTasks = quote.tasks?.filter(t => t.status === 'completed').length || 0;
    const uncompletedTasks = useMemo(() => {
        const taskMasterMap = new Map((database.task_master?.data as any[] || []).map(t => [t.id, t.name]));
        return quote.tasks?.filter(t => t.status !== 'completed').map(t => taskMasterMap.get(t.task_master_id) || '不明なタスク').slice(0, 3) || [];
    }, [quote.tasks, database.task_master]);

    const dueDate = quote.estimated_delivery_date ? new Date(quote.estimated_delivery_date as string) : null;
    let dueDateClass = '';
    if (dueDate) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffDays = (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0) {
            dueDateClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
        } else if (diffDays <= 3) {
            dueDateClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
        }
    }
    
    const totalQuantity = useMemo(() => quote.items.reduce((sum: number, i: Row) => sum + (i.quantity || 0), 0), [quote.items]);
    
    const cardImage = useMemo(() => {
        const designs = (database.quote_designs?.data as PrintDesign[] || []).filter(d => String(d.quote_id) === String(quote.id));
        return designs.find(d => d.imageSrc)?.imageSrc || null;
    }, [quote.id, database.quote_designs]);

    return (
        <div 
            draggable
            onDragStart={(e) => onDragStart(e, quote)}
            onDragEnd={onDragEnd}
            onClick={() => onDetailsClick(quote)}
            className="bg-card-bg dark:bg-card-bg-dark rounded-lg shadow-md hover:shadow-xl transition-shadow border border-transparent hover:border-brand-primary mb-3 cursor-pointer active:cursor-grabbing virtual-scroll-card"
        >
            <div className="density-target-padding p-3">
                {cardImage && <img src={cardImage} alt="デザインプレビュー" className="w-full h-24 object-contain rounded-md bg-card-image-bg dark:bg-card-image-bg-dark mb-2" loading="lazy" />}
                
                <div className="flex justify-between items-start">
                     <div>
                        <p className="font-bold text-sm hover:underline">{quote.quote_code}</p>
                        <p className="text-xs text-muted dark:text-muted-dark truncate" title={quote.customer?.company_name as string || quote.customer?.name_kanji as string}>{quote.customer?.company_name || quote.customer?.name_kanji}</p>
                    </div>
                     {dueDate && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${dueDateClass}`}>
                            納期: {dueDate.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                        </span>
                     )}
                </div>
                
                 <p className="text-xs text-muted dark:text-muted-dark mt-2 truncate">{quote.subject}</p>
                
                <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-1">
                    {uncompletedTasks.map((taskName, index) => (
                        <span key={index} className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-container-muted-bg text-muted dark:bg-container-muted-bg-dark dark:text-muted-dark">{taskName}</span>
                    ))}
                </div>

                <div className="mt-2 pt-2 border-t border-container-muted-bg dark:border-container-muted-bg-dark flex justify-between items-center text-xs text-muted dark:text-muted-dark">
                    <p>計: {totalQuantity}枚 / ¥{(quote.total_cost_in_tax as number || 0).toLocaleString()}</p>
                    {totalTasks > 0 && (
                        <div className="flex items-center gap-1" title={`${completedTasks} / ${totalTasks} タスク完了`}>
                            <i className={`fa-solid fa-clipboard-check ${completedTasks === totalTasks ? 'text-green-500' : 'text-gray-400'}`}></i>
                            <span>{completedTasks}/{totalTasks}</span>
                        </div>
                    )}
                </div>
                 <div className="mt-2 pt-2 border-t border-container-muted-bg dark:border-container-muted-bg-dark flex justify-end gap-1">
                     <button className="p-1 text-gray-400 hover:text-brand-primary" title="指示書"><i className="fa-solid fa-file-invoice"></i></button>
                     <button className="p-1 text-gray-400 hover:text-brand-primary" title="印刷履歴"><i className="fa-solid fa-print"></i></button>
                     <button className="p-1 text-gray-400 hover:text-brand-primary" title="仕上がり写真"><i className="fa-solid fa-camera"></i></button>
                     <button className="p-1 text-gray-400 hover:text-brand-primary" title="各種書類"><PaperclipIcon className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
});

export default QuoteCard;