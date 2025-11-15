import React, { useState } from 'react';

interface PaymentDateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (date: string) => void;
    currentDate: string;
}

const PaymentDateModal: React.FC<PaymentDateModalProps> = ({ isOpen, onClose, onSave, currentDate }) => {
    const [date, setDate] = useState(currentDate);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">入金日を入力</h3>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2 border border-default dark:border-default-dark rounded-md mb-4 bg-input-bg dark:bg-input-bg-dark"
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onSave(date)}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90"
                    >
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentDateModal;