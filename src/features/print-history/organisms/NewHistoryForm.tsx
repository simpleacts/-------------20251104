import React, { useMemo, useState } from 'react';
import { Database, Row } from '@shared/types';
import { SpinnerIcon } from '@components/atoms';
import DesignHistoryForm from '../molecules/DesignHistoryForm';

interface NewHistoryFormProps {
    selectedQuote: Row;
    database: Database;
    onSave: (operations: { tableName: string, data: Row }[]) => void;
    onCancel: () => void;
}

const NewHistoryForm: React.FC<NewHistoryFormProps> = ({ selectedQuote, database, onSave, onCancel }) => {
    const [positionNotes, setPositionNotes] = useState<Record<string, string>>({});
    const [images, setImages] = useState<Record<string, { name: string, dataUrl: string }>>({});
    const [generalNotes, setGeneralNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const quoteDesigns = useMemo(() => {
        return (database.quote_designs as any)?.data.filter((d: Row) => d.quote_id === selectedQuote.id);
    }, [selectedQuote, database.quote_designs]);

    const quoteItems = useMemo(() => {
         return (database.quote_items as any)?.data.filter((i: Row) => i.quote_id === selectedQuote.id) || [];
    }, [selectedQuote, database.quote_items]);

    const handleSave = () => {
        setIsLoading(true);
        const historyId = `hist_${Date.now()}`;

        const operations: { tableName: string, data: Row }[] = [];
        operations.push({
            tableName: 'print_history',
            data: { id: historyId, quote_id: selectedQuote.id, printed_at: new Date().toISOString(), notes: generalNotes },
        });

        Object.entries(positionNotes).forEach(([designId, notesJson]) => {
            // FIX: Cast notesJson to string to use .trim()
            if (notesJson && (notesJson as string).trim() !== '' && (notesJson as string).trim() !== '{}') {
                operations.push({
                    tableName: 'print_history_positions',
                    data: { id: `pos_${Date.now()}_${designId}`, print_history_id: historyId, location: designId, position_notes: notesJson }
                });

                // Check for and add new metrics
                try {
                    // FIX: Cast notesJson to string for JSON.parse
                    const measurements = JSON.parse(notesJson as string);
                    const quoteDesign = quoteDesigns.find((d: Row) => d.id === designId);
                    const locationId = quoteDesign?.location;

                    if (locationId && typeof measurements === 'object' && measurements !== null) {
                        const allLabels = new Set<string>();
                        Object.values(measurements).forEach((sizeData: any) => {
                            Object.keys(sizeData).forEach(label => allLabels.add(label));
                        });

                        const printLocationMetricsTable = database.print_location_metrics as Table | undefined;
                        const metricsData = (printLocationMetricsTable && Array.isArray(printLocationMetricsTable.data))
                            ? printLocationMetricsTable.data as Row[]
                            : [];
                        const existingMetrics = new Set(
                            metricsData
                                .filter(m => m.location_id === locationId)
                                .map(m => m.metric_label)
                        );
                        
                        allLabels.forEach(label => {
                            if (!existingMetrics.has(label)) {
                                operations.push({
                                    tableName: 'print_location_metrics',
                                    data: {
                                        id: `metric_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                        location_id: locationId,
                                        metric_key: `custom_${label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
                                        metric_label: label,
                                        unit: 'cm',
                                        sort_order: 999
                                    }
                                });
                                // Add to set to prevent duplicate additions in the same save operation if multiple designs use the same new metric
                                existingMetrics.add(label);
                            }
                        });
                    }
                } catch (e) {
                    console.warn(`Could not parse position_notes JSON for design ${designId} to check for new metrics.`, e);
                }
            }
        });
        
        Object.entries(images).forEach(([designId, img]) => {
            // FIX: Cast img to access its properties
            const imgData = img as { name: string, dataUrl: string };
            if (imgData && imgData.dataUrl) {
                operations.push({
                    tableName: 'print_history_images',
                    data: { id: `img_${Date.now()}_${designId}`, print_history_id: historyId, image_name: imgData.name, image_data_url: imgData.dataUrl }
                });
            }
        });

        setTimeout(() => { // Simulate async operation
            onSave(operations);
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <h2 className="text-xl font-bold flex-shrink-0">新規履歴の登録</h2>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                {quoteDesigns.map((design: Row) => {
                    const location = (database.print_locations as any).data.find((l: Row) => l.locationId === design.location)?.label;
                    return (
                        <DesignHistoryForm
                            key={design.id as string}
                            design={design}
                            quoteItems={quoteItems}
                            database={database}
                            designLabel={`${location} (${design.print_size})`}
                            notes={positionNotes[design.id as string] || ''}
                            onNotesChange={(notes) => setPositionNotes(p => ({ ...p, [design.id as string]: notes }))}
                            image={images[design.id as string] || null}
                            onImageChange={(image) => setImages(p => ({...p, [design.id as string]: image}))}
                        />
                    );
                })}
                <div>
                    <label htmlFor="general-notes-textarea" className="font-semibold text-sm">総合メモ</label>
                    <textarea id="general-notes-textarea" name="general_notes" value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={3} className="w-full p-1 border rounded mt-1 bg-input-bg dark:bg-input-bg-dark" />
                </div>
            </div>
            <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t">
                <button onClick={onCancel} className="px-4 py-2 text-sm rounded bg-gray-200">キャンセル</button>
                <button onClick={handleSave} disabled={isLoading} className="px-4 py-2 text-sm rounded bg-brand-primary text-white flex items-center gap-2">
                    {isLoading && <SpinnerIcon className="w-4 h-4" />}
                    {isLoading ? '保存中...' : '保存'}
                </button>
            </div>
        </div>
    );
};

export default NewHistoryForm;