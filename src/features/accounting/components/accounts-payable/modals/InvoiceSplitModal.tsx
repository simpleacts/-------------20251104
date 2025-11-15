

import React from 'react';
import { Row } from '@shared/types';
import { XMarkIcon } from '@components/atoms';

interface InvoiceSplitModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceData: Row;
    onSave: (splitData: any) => void;
}

const InvoiceSplitModal: React.FC<InvoiceSplitModalProps> = ({ isOpen, onClose, invoiceData, onSave }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">請求書を分割</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="overflow-y-auto p-6 text-center">
                    <h3 className="text-lg font-semibold">請求書分割機能</h3>
                    <p className="mt-4 text-gray-600">この機能は現在開発中です。</p>
                    <p className="text-sm text-gray-500 mt-2">
                        ここでは、1つの請求書を複数の請求書に分割する操作を行います。<br/>
                        例えば、請求先が複数に分かれる場合などに使用します。
                    </p>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">
                        閉じる
                    </button>
                    <button disabled className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white disabled:bg-gray-400">
                        分割を保存
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InvoiceSplitModal;