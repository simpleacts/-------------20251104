import React, { useMemo, useState } from 'react';
import { Database, Row } from '@shared/types';
import { TrashIcon, UploadIcon } from '@components/atoms';
import PositionMeasurementModal from '../modals/PositionMeasurementModal';

interface DesignHistoryFormProps {
    design: Row;
    quoteItems: Row[];
    database: Database;
    designLabel: string;
    notes: string;
    onNotesChange: (notes: string) => void;
    image: { name: string, dataUrl: string } | null;
    onImageChange: (image: { name: string, dataUrl: string } | null) => void;
}

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const DesignHistoryForm: React.FC<DesignHistoryFormProps> = ({ design, quoteItems, database, designLabel, notes, onNotesChange, image, onImageChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const designId = design.id as string;

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const dataUrl = await fileToDataURL(file);
        onImageChange({ name: `${designId}_${file.name}`, dataUrl });
    };
    
    const measurementData = useMemo(() => {
        try {
            const data = JSON.parse(notes);
            return (typeof data === 'object' && data !== null && !Array.isArray(data)) ? data : null;
        } catch {
            return null;
        }
    }, [notes]);

    return (
      <>
        <div className="p-3 bg-base-200 dark:bg-base-dark-300 rounded">
            <h3 className="font-semibold">{designLabel}</h3>
            <div className="mt-2">
                <label className="text-xs font-medium">位置メモ</label>
                {measurementData ? (
                    <div className="text-xs p-2 bg-base-100 dark:bg-base-dark-200 rounded mt-1">
                        {Object.entries(measurementData).map(([size, metrics]) => (
                            <div key={size}><strong>{size}:</strong> {Object.entries(metrics as object).map(([k,v]) => `${k}:${v}`).join(' / ')}</div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs p-2 bg-base-100 dark:bg-base-dark-200 rounded mt-1">{notes || '登録されていません'}</p>
                )}
                 <button type="button" onClick={() => setIsModalOpen(true)} className="mt-1 text-xs bg-gray-300 px-2 py-1 rounded hover:bg-gray-400">
                    詳細を登録
                </button>
            </div>
            <div className="mt-2">
                <label className="text-xs font-medium">仕上がり写真</label>
                {image ? (
                     <div className="flex items-center gap-2 mt-1">
                        <img src={image.dataUrl} className="w-16 h-16 object-cover rounded" loading="lazy"/>
                        <p className="text-xs truncate flex-grow">{image.name}</p>
                        <button onClick={() => onImageChange(null)} className="text-red-500 p-1"><TrashIcon className="w-4 h-4"/></button>
                     </div>
                ) : (
                    <label className="mt-1 flex items-center gap-2 text-xs p-2 border border-dashed rounded cursor-pointer hover:bg-hover-bg dark:hover:bg-hover-bg-dark">
                        <UploadIcon className="w-4 h-4"/>
                        <span>写真を選択</span>
                        <input type="file" accept="image/*" onChange={e => e.target.files && handleImageUpload(e.target.files[0])} className="hidden"/>
                    </label>
                )}
            </div>
        </div>
        {isModalOpen && (
            <PositionMeasurementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onNotesChange}
                initialNotes={notes}
                design={design}
                quoteItems={quoteItems}
                database={database}
            />
        )}
      </>
    );
};

export default DesignHistoryForm;