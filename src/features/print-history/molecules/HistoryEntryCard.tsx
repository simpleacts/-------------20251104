import React from 'react';
import { Database, Row } from '@shared/types';
import { TrashIcon } from '@components/atoms';

interface HistoryEntryCardProps {
    entry: Row;
    database: Database;
    onDelete: () => void;
}

const renderMeasurementNotes = (notes: string, metrics: Row[]) => {
    try {
        const data = JSON.parse(notes);
        if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error("Not a valid JSON object for measurements.");
        
        const metricMap = new Map(metrics.map(m => [m.metric_key, m.metric_label]));
        
        const sizes = Object.keys(data);
        if (sizes.length === 0) return <p className="text-xs p-2 bg-base-100 dark:bg-base-dark-200 rounded mt-1">{notes}</p>;

        const headers = Array.from(new Set(sizes.flatMap(s => Object.keys(data[s]))))
            .map(key => ({ key, label: metricMap.get(key) || key }));

        return (
            <table className="w-full text-xs mt-1 border-collapse bg-base-100 dark:bg-base-dark-200">
                <thead>
                    <tr className="bg-base-200 dark:bg-base-dark-300">
                        <th className="p-1 border border-default">サイズ</th>
                        {headers.map(h => <th key={h.key} className="p-1 border border-default">{h.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {sizes.map(size => (
                        <tr key={size}>
                            <td className="p-1 border border-default font-semibold">{size}</td>
                            {headers.map(h => (
                                <td key={h.key} className="p-1 border border-default text-center">{data[size][h.key] || '-'}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    } catch (e) {
        return <p className="text-xs p-2 bg-base-100 dark:bg-base-dark-200 rounded mt-1">{notes}</p>;
    }
}


const HistoryEntryCard: React.FC<HistoryEntryCardProps> = ({ entry, database, onDelete }) => {
    const positions = (database.print_history_positions as any)?.data.filter((p: Row) => p.print_history_id === entry.id) || [];
    const entryImages = (database.print_history_images as any)?.data.filter((i: Row) => i.print_history_id === entry.id) || [];
    const allMetrics = database.print_location_metrics?.data || [];

    return (
        <div className="p-4 bg-base-200 dark:bg-base-dark-300 rounded-lg">
            <div className="flex justify-between items-start">
                <p className="font-semibold text-sm">記録日時: {new Date(entry.printed_at as string).toLocaleString('ja-JP')}</p>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-4 h-4" /></button>
            </div>
            {entry.notes && <div className="mt-2 pt-2 border-t"><p className="font-semibold text-xs">総合メモ:</p><pre className="whitespace-pre-wrap font-sans text-xs bg-base-100 dark:bg-base-dark-200 p-2 rounded">{entry.notes}</pre></div>}
            <div className="mt-2 pt-2 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                {positions.map((pos: Row) => {
                    const design = (database.quote_designs as any).data.find((d: Row) => String(d.id) === String(pos.location));
                    const location = (database.print_locations as any).data.find((l: Row) => l.locationId === design?.location)?.label;
                    const metricsForLocation = allMetrics.filter(m => m.location_id === design?.location);
                    const image = entryImages.find((img: Row) => String(img.image_name).includes(String(pos.location)));
                    return (
                        <div key={pos.id as string} className="text-xs">
                            <p className="font-bold">{location || `デザインID: ${pos.location}`}</p>
                            <div className="mt-1">
                                {renderMeasurementNotes(pos.position_notes as string, metricsForLocation)}
                            </div>
                            {image && <img src={image.image_data_url as string} alt={image.image_name as string} className="mt-2 rounded max-w-full h-auto" loading="lazy" />}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default HistoryEntryCard;