import React from 'react';

interface ImageAttachmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (action: 'embed' | 'attach') => void;
}

const ImageAttachmentModal: React.FC<ImageAttachmentModalProps> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b">
                    <h3 className="font-bold">画像の追加方法</h3>
                </header>
                <main className="p-4 flex flex-col gap-4">
                     <button onClick={() => onSelect('embed')} className="w-full text-left p-3 border rounded-md hover:bg-gray-100">本文に埋め込む</button>
                     <button onClick={() => onSelect('attach')} className="w-full text-left p-3 border rounded-md hover:bg-gray-100">ファイルとして添付</button>
                </main>
            </div>
        </div>
    );
};

export default ImageAttachmentModal;
