import React from 'react';

interface QuoteTypeSelectorProps {
    onSelect: (type: string) => void;
}

const QuoteTypeSelector: React.FC<QuoteTypeSelectorProps> = ({ onSelect }) => {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-4xl mx-auto p-8">
                <h1 className="text-3xl font-bold text-center mb-2">新規見積作成</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-10">どの事業の見積もりを作成しますか？</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button
                        onClick={() => onSelect('プリント事業')}
                        className="group p-8 bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
                    >
                        <i className="fas fa-tshirt text-4xl text-brand-secondary mb-4"></i>
                        <h2 className="text-xl font-bold mb-2">プリント事業</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Tシャツ、パーカーなどへのシルクスクリーン印刷やDTFプリントの見積を作成します。</p>
                    </button>
                    <button
                        onClick={() => onSelect('DTF製品販売事業')}
                        className="group p-8 bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
                    >
                        <i className="fas fa-print text-4xl text-gray-400 mb-4"></i>
                        <h2 className="text-xl font-bold mb-2">DTF製品販売事業</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">DTFプリンター、インク、プレス機などの機材や消耗品の販売見積を作成します。</p>
                    </button>
                </div>
            </div>
        </div>
    );
};
export default QuoteTypeSelector;