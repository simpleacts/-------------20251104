import { XMarkIcon } from '@components/atoms';
import { CanvasState } from '@shared/types';
import React from 'react';
import CanvasPreview from '../atoms/CanvasPreview';

interface DesignSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (canvasId: string) => void;
    canvases: CanvasState[];
}

const DesignSelectionModal: React.FC<DesignSelectionModalProps> = ({ isOpen, onClose, onSelect, canvases }) => {
    if (!isOpen) return null;

    const handleSelectAndClose = (canvasId: string) => {
        onSelect(canvasId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">デザインを選択</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-grow overflow-y-auto p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {canvases.map(canvas => (
                            <div 
                                key={canvas.id}
                                onClick={() => handleSelectAndClose(canvas.id)}
                                className="bg-base-200 dark:bg-base-dark-300 rounded-lg p-3 cursor-pointer hover:ring-2 hover:ring-brand-secondary transition-all"
                            >
                                <div className="w-full aspect-square bg-white dark:bg-gray-500 rounded-md mb-2 overflow-hidden">
                                   <CanvasPreview layers={canvas.layers} width={200} height={200} />
                                </div>
                                <h4 className="font-semibold text-sm truncate" title={canvas.name}>{canvas.name}</h4>
                            </div>
                        ))}
                    </div>
                    {canvases.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p>この案件で利用可能なデザインがありません。</p>
                            <p className="text-xs">先に「仕上がりイメージメーカー」でデザインを作成してください。</p>
                        </div>
                    )}
                </main>
                 <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">
                        閉じる
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default DesignSelectionModal;