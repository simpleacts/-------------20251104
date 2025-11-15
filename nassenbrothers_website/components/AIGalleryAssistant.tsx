import React, { useState, useRef, useEffect } from 'react';

interface AIGalleryAssistantProps {
    articleTitle: string;
    articleContent: string;
    onImageInsert: (imageUrl: string) => void;
}

const callGeminiProxy = async (payload: object): Promise<any> => {
    const response = await fetch('/api/gemini_proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'AI Proxy Error');
    }
    return response.json();
};

export const AIGalleryAssistant: React.FC<AIGalleryAssistantProps> = ({ articleTitle, articleContent, onImageInsert }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (
        <>
            <div className="absolute top-1 right-1">
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="p-1.5 text-gray-400 hover:text-secondary"
                    aria-label="AIで挿絵を生成"
                    title="AIで挿絵を生成"
                >
                    <i className="fas fa-palette"></i>
                </button>
            </div>
            {isModalOpen && (
                <AssistantModal
                    articleTitle={articleTitle}
                    articleContent={articleContent}
                    onImageInsert={onImageInsert}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
};

const AssistantModal: React.FC<AIGalleryAssistantProps & { onClose: () => void }> = ({ articleTitle, articleContent, onImageInsert, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'suggesting' | 'generating' | 'uploading'>('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    const handleSuggestPrompts = async () => {
        setStatus('suggesting');
        setError('');
        setPromptSuggestions([]);
        try {
            const generationPrompt = `以下のブログ記事のタイトルと本文を読んで、この記事に最適な挿絵のプロンプトを3つ提案してください。プロンプトは簡潔で、画像生成AIが理解しやすい具体的な英語のキーワードで構成してください。各プロンプトは改行で区切ってください。\n\nタイトル: ${articleTitle}\n\n本文の冒頭:\n${articleContent.substring(0, 500)}...`;
            const payload = {
                model: 'gemini-2.5-flash',
                contents: generationPrompt,
            };
            const result = await callGeminiProxy(payload);
            const text = result.candidates[0]?.content?.parts[0]?.text || '';
            setPromptSuggestions(text.split('\n').filter(p => p.trim() !== ''));
        } catch (e) {
            setError('プロンプトの提案中にエラーが発生しました。');
            console.error(e);
        } finally {
            setStatus('idle');
        }
    };

    const handleGenerateImage = async () => {
        if (!prompt) {
            setError('プロンプトを入力してください。');
            return;
        }
        setStatus('generating');
        setError('');
        setGeneratedImage(null);
        try {
            // Note: The proxy will need to handle the different endpoint for image generation.
            // We pass the model name and the proxy script will adjust.
            const payload = {
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1, aspectRatio: '4:3' },
            };
            const result = await callGeminiProxy(payload);
            const base64Image = result.generatedImages[0].image.imageBytes;
            setGeneratedImage(`data:image/jpeg;base64,${base64Image}`);
        } catch (e) {
            setError('画像の生成中にエラーが発生しました。');
            console.error(e);
        } finally {
            setStatus('idle');
        }
    };

    const handleInsertImage = async () => {
        if (!generatedImage) return;
        setStatus('uploading');
        setError('');
        try {
            const response = await fetch('/api/upload_base64_image.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageData: generatedImage }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || '画像のアップロードに失敗しました。');
            }
            onImageInsert(result.filePath);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : '画像の挿入中にエラーが発生しました。');
            console.error(e);
        } finally {
            setStatus('idle');
        }
    };

    const isLoading = status !== 'idle';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white shadow-2xl w-full max-w-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <i className="fas fa-palette text-secondary"></i>AI挿絵アシスタント
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 text-2xl" aria-label="閉じる">&times;</button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    {/* Prompt Suggestions */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">1. プロンプトのアイデアを得る</label>
                        <button onClick={handleSuggestPrompts} disabled={isLoading} className="w-full bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm disabled:opacity-50">
                            {status === 'suggesting' ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-lightbulb mr-2"></i>}
                            記事の内容からプロンプトを提案
                        </button>
                        {promptSuggestions.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {promptSuggestions.map((s, i) => (
                                    <button key={i} onClick={() => setPrompt(s)} className="text-xs p-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-left">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <label htmlFor="image-prompt" className="text-sm font-medium text-gray-700">2. 生成したい画像の内容を入力</label>
                        <textarea
                            id="image-prompt"
                            rows={3}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="例: A stylish T-shirt with a cool, minimalist geometric design, vector art."
                            className="w-full p-2 border border-gray-300 rounded-md"
                            disabled={isLoading}
                        />
                        <button onClick={handleGenerateImage} disabled={isLoading || !prompt} className="w-full bg-secondary text-white font-bold p-2 rounded disabled:bg-gray-400">
                             {status === 'generating' ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-image mr-2"></i>}
                             画像を生成
                        </button>
                    </div>
                     {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    {/* Image Preview */}
                    {generatedImage && (
                        <div className="space-y-4 border-t pt-4">
                            <label className="text-sm font-medium text-gray-700">3. 生成された画像を記事に挿入</label>
                            <div className="bg-gray-100 p-2 rounded">
                                <img src={generatedImage} alt="AI-generated" className="w-full h-auto max-h-64 object-contain" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleGenerateImage} disabled={isLoading} className="flex-1 bg-gray-500 text-white p-2 rounded disabled:opacity-50">
                                    {status === 'generating' ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-redo mr-2"></i>}
                                    再生成
                                </button>
                                <button onClick={handleInsertImage} disabled={isLoading} className="flex-1 bg-green-600 text-white font-bold p-2 rounded disabled:opacity-50">
                                    {status === 'uploading' ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-import mr-2"></i>}
                                    この記事に挿入
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
