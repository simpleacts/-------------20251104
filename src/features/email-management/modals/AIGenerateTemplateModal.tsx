import { Button, SparklesIcon, SpinnerIcon, Textarea, XMarkIcon } from '@components/atoms';
import React, { useState } from 'react';

const AIGenerateTemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => void;
    isGenerating: boolean;
    aiError: string | null;
}> = ({ isOpen, onClose, onGenerate, isGenerating, aiError }) => {
    const [prompt, setPrompt] = useState('');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">AIで定型文を生成</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="p-6 space-y-4">
                    {aiError && <p className="text-sm text-red-500 bg-red-100 p-2 rounded">{aiError}</p>}
                    <div>
                        <label className="block text-sm font-medium mb-1">どのような内容の定型文を作成しますか？</label>
                        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="例: 入金確認と製作開始を伝える丁寧なメール"/>
                    </div>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                    <Button variant="secondary" onClick={onClose}>キャンセル</Button>
                    <Button onClick={() => onGenerate(prompt)} disabled={isGenerating || !prompt.trim()}>
                        {isGenerating ? <SpinnerIcon className="w-5 h-5 mr-2"/> : <SparklesIcon className="w-5 h-5 mr-2"/>}
                        {isGenerating ? '生成中...' : '生成'}
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default AIGenerateTemplateModal;