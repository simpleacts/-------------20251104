import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

const personas = [
    { id: 'expert', name: '親しみやすい専門家', prompt: 'あなたはオリジナルTシャツ制作の専門家です。フレンドリーで、専門用語を避けつつも説得力のある、プロフェッショナルなトーンで文章を書いてください。' },
    { id: 'beginner', name: '情熱的な初心者', prompt: 'あなたは初めてオリジナルTシャツを作ることにワクワクしている初心者です。読者の共感を呼ぶような、情熱的で、少し素人っぽい、楽しさが伝わるトーンで文章を書いてください。' },
    { id: 'analyst', name: 'プロの分析家', prompt: 'あなたはアパレル業界のプロの分析家です。客観的で、データに基づいた事実を重視し、簡潔で論理的なトーンで文章を書いてください。' },
];

export const AIAssistant: React.FC<{ currentValue: string; onUpdate: (newValue: string) => void; }> = ({ currentValue, onUpdate }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedPersona, setSelectedPersona] = useState(personas[0].id);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    // FIX: Refactored to handle both replacing and appending text based on the `mode` parameter.
    const callGemini = async (prompt: string, mode: 'replace' | 'append', systemInstruction?: string) => {
        if (!currentValue && mode === 'replace') {
            setError('テキストが空です。');
            setTimeout(() => setError(''), 3000);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                ...(systemInstruction && { config: { systemInstruction } }),
            });
            
            if (mode === 'append') {
                onUpdate(currentValue + '\n\n' + response.text);
            } else {
                onUpdate(response.text);
            }
            setIsPanelOpen(false);
        } catch (e) {
            console.error(e);
            setError('AIの処理中にエラーが発生しました。');
            setTimeout(() => setError(''), 5000);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleProofread = () => {
        const prompt = `以下の文章を校正し、誤字脱字の修正、文法の改善を行い、より自然で分かりやすい表現にしてください。元の文章の意図や要点は変えないでください。\n\n---\n${currentValue}`;
        callGemini(prompt, 'replace');
    };

    const handleRewrite = () => {
        const persona = personas.find(p => p.id === selectedPersona);
        if (persona) {
            callGemini(currentValue, 'replace', persona.prompt);
        }
    };
    
    const handleExpand = () => {
        const prompt = `以下の文章に続く内容として、より詳細な情報や具体例を追記してください。自然な流れでコンテンツが豊かになるようにしてください。\n\n---\n${currentValue}`;
        callGemini(prompt, 'append');
    };

    return (
        <div className="absolute top-1 right-1">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsPanelOpen(p => !p)}
                className="p-1.5 text-gray-400 hover:text-secondary"
                aria-label="AIアシスタント"
            >
                <i className="fas fa-magic-sparkles"></i>
            </button>
            {isPanelOpen && (
                <div ref={panelRef} className="absolute top-full right-0 z-20 w-64 bg-white shadow-lg border rounded-md p-3 space-y-3">
                    <button type="button" onClick={handleProofread} disabled={isLoading} className="w-full flex items-center justify-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 p-2 rounded disabled:opacity-50">
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                        校正・洗練
                    </button>
                     <button type="button" onClick={handleExpand} disabled={isLoading} className="w-full flex items-center justify-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 p-2 rounded disabled:opacity-50">
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-expand-arrows-alt"></i>}
                        内容を追記
                    </button>
                    <div className="space-y-1">
                        <select value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)} disabled={isLoading} className="w-full text-xs p-1 border rounded">
                            {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button type="button" onClick={handleRewrite} disabled={isLoading} className="w-full flex items-center justify-center gap-2 text-sm bg-secondary text-white hover:bg-secondary/90 p-2 rounded disabled:opacity-50">
                             {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-pen-nib"></i>}
                             ペルソナでリライト
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            )}
        </div>
    );
};