import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// FIX: Added interface to accept `isLocked` prop.
interface ThemeGeneratorProps {
    isLocked: boolean;
}

type ThemeItem = { key: string; value: string; isHeader: boolean; };

const parseThemeCsv = (csvText: string): ThemeItem[] => {
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    return lines.map(line => {
        const parts = line.split(/,(.*)/s);
        const rawKey = parts[0] ? parts[0].trim() : '';
        let value = parts[1] ? parts[1].trim() : '';
        const isHeader = rawKey.startsWith('"') && rawKey.endsWith('"') && value === '';
        const key = rawKey.replace(/^"|"$/g, '');
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }
        return { key, value, isHeader };
    });
};

const themeToCsv = (items: ThemeItem[]): string => {
    return items.map(item => {
        let key = item.isHeader ? `"${item.key.replace(/"/g, '""')}"` : item.key;
        let value = item.value;
        if (!item.isHeader && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
        }
        return item.isHeader ? `${key},` : `${key},${value}`;
    }).join('\n');
};

const callGeminiProxy = async (payload: object): Promise<any> => {
    const response = await fetch('/api/gemini_proxy.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'AI Proxy Error');
    }
    return response.json();
};

// FIX: Added LockedOverlay component to show when the feature is locked.
const LockedOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
        <i className="fas fa-lock text-4xl text-gray-500 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-700">機能はロックされています</h3>
        <p className="text-gray-600">この機能の編集は現在ロックされています。</p>
        <p className="text-sm text-gray-500 mt-2">ロックを解除するには、開発ツールに移動してください。</p>
    </div>
);

const ThemeGenerator: React.FC<ThemeGeneratorProps> = ({ isLocked }) => {
    const [themeItems, setThemeItems] = useState<ThemeItem[]>([]);
    const [originalItems, setOriginalItems] = useState<ThemeItem[]>([]);
    const [pageOptions, setPageOptions] = useState<{ value: string; label: string }[]>([
        { value: 'site_wide', label: 'サイト全体' }
    ]);
    const [loading, setLoading] = useState(true);
    const [activePage, setActivePage] = useState('site_wide');
    const [searchQuery, setSearchQuery] = useState('未来的でミニマル');
    const [applyOptions, setApplyOptions] = useState({ colors: true, fonts: true, layout: false });
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [layoutSuggestion, setLayoutSuggestion] = useState('');
    const [status, setStatus] = useState<'idle' | 'searching' | 'analyzing' | 'saving'>('idle');
    const [error, setError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const isDirty = useMemo(() => JSON.stringify(themeItems) !== JSON.stringify(originalItems), [themeItems, originalItems]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setStatus('idle');
        setError(null);
        try {
            const [themeResponse, pagesResponse] = await Promise.all([
                fetch('/templates/theme_settings.csv?cachebust=' + new Date().getTime()),
                fetch('/templates/pages_content.json?cachebust=' + new Date().getTime())
            ]);
            
            if (!themeResponse.ok) throw new Error('テーマ設定ファイルの読み込みに失敗しました。');
            if (!pagesResponse.ok) throw new Error('ページ情報の読み込みに失敗しました。');
            
            const csvText = await themeResponse.text();
            
            const pagesContentText = await pagesResponse.text();
            let pagesContent;
            try {
                pagesContent = JSON.parse(pagesContentText);
            } catch (e) {
                console.error("Invalid JSON in pages_content.json:", pagesContentText);
                throw new Error(`ページコンテンツファイルの解析に失敗しました。ファイルが破損している可能性があります。Error: ${(e as Error).message}`);
            }

            const parsedItems = parseThemeCsv(csvText);
            setThemeItems(parsedItems);
            setOriginalItems(parsedItems);

            const dynamicPages = Object.keys(pagesContent).map(key => ({
                value: key,
                label: pagesContent[key].meta_title.split('|')[0].trim()
            }));

            const standardPages = [
                { value: 'home', label: 'トップページ' },
                { value: 'articles', label: '記事一覧・詳細ページ' },
                { value: 'gallery', label: 'ギャラリーページ' },
            ];
            
            const allOptions = [
                { value: 'site_wide', label: 'サイト全体' },
                ...standardPages,
                ...dynamicPages
            ];
            
            setPageOptions(allOptions);

        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        
        themeItems.forEach(item => {
            if (!item.isHeader && item.key) {
                const kebabKey = item.key.replace(/_/g, '-');
                iframe.contentWindow?.postMessage({
                    type: 'THEME_UPDATE',
                    payload: { key: `--${kebabKey}`, value: item.value }
                }, '*');
            }
        });
    }, [themeItems]);


    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        setStatus('searching');
        setError(null);
        setGeneratedImages([]);
        setLayoutSuggestion('');
        try {
            const pageLabel = pageOptions.find(p => p.value === activePage)?.label || 'ウェブサイト';
            const prompt = `A modern, stylish e-commerce website screenshot for a T-shirt printing company. The theme is "${searchQuery}". This screenshot is for the "${pageLabel}" part of the site. Clean UI/UX, professional, high-quality, web design inspiration.`;
            const payload = { model: 'imagen-4.0-generate-001', prompt, config: { numberOfImages: 4, aspectRatio: '4:3' }};
            const result = await callGeminiProxy(payload);
            const images = result.generatedImages.map((img: any) => `data:image/jpeg;base64,${img.image.imageBytes}`);
            setGeneratedImages(images);
        } catch (err) {
            setError(err instanceof Error ? err.message : '画像生成中にエラーが発生しました。');
        } finally {
            setStatus('idle');
        }
    };
    
    const handleImageSelect = async (base64Image: string) => {
        if (!applyOptions.colors && !applyOptions.fonts && !applyOptions.layout) {
            setError("最低1つの適用オプションを選択してください。");
            setTimeout(() => setError(null), 3000);
            return;
        }
        setStatus('analyzing');
        setError(null);
        setLayoutSuggestion('');
        try {
            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
            
            let promptText = 'Analyze this website screenshot.';
            let properties: any = {};

            if (applyOptions.colors || applyOptions.fonts) {
                promptText += ' Extract its color palette (primary, secondary, accent, background, text colors) and suggest a suitable font pairing (heading and base font from Google Fonts).';
                properties = {
                    ...properties,
                    primary_color: { type: Type.STRING },
                    secondary_color: { type: Type.STRING },
                    accent_color: { type: Type.STRING },
                    background_color_base: { type: Type.STRING },
                    text_color_base: { type: Type.STRING },
                    font_family_heading: { type: Type.STRING },
                    font_family_base: { type: Type.STRING },
                };
            }

            if (applyOptions.layout) {
                const pageLabel = pageOptions.find(p => p.value === activePage)?.label || 'this page';
                promptText += ` Also, analyze the layout structure for the "${pageLabel}" and provide a descriptive suggestion in Japanese. Describe main sections like header, main content area (e.g., 2-column grid), sidebar, and footer.`;
                properties.layoutSuggestion = { type: Type.STRING, description: "A textual description of the page layout in Japanese." };
            }
            
            promptText += ' Respond in JSON format.';
            
            const textPart = { text: promptText };
            
            const payload = {
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
                config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties } }
            };
            const result = await callGeminiProxy(payload);
            const rawText = result.candidates[0]?.content?.parts[0]?.text || '{}';
            let jsonString = rawText;
            const markdownMatch = rawText.match(/```(json)?\s*([\s\S]*?)\s*```/);
            if (markdownMatch && markdownMatch[2]) {
                jsonString = markdownMatch[2];
            } else {
                const firstBracket = rawText.indexOf('[');
                const firstBrace = rawText.indexOf('{');
                if (firstBracket !== -1 || firstBrace !== -1) {
                    const start = (firstBracket === -1) ? firstBrace : (firstBrace === -1) ? firstBracket : Math.min(firstBracket, firstBrace);
                    const lastBracket = rawText.lastIndexOf(']');
                    const lastBrace = rawText.lastIndexOf('}');
                    const end = Math.max(lastBracket, lastBrace);
                    if (end > start) {
                        jsonString = rawText.substring(start, end + 1);
                    }
                }
            }
            const analysisResult = JSON.parse(jsonString.trim());

            if (applyOptions.layout && analysisResult.layoutSuggestion) {
                setLayoutSuggestion(analysisResult.layoutSuggestion);
            }
            
            setThemeItems(prevItems => {
                const newItems = [...prevItems];
                const themePalette = { ...analysisResult };
                delete themePalette.layoutSuggestion;

                for (const [key, value] of Object.entries(themePalette)) {
                    if ((applyOptions.colors && key.includes('_color')) || (applyOptions.fonts && key.includes('font_family'))) {
                         const itemIndex = newItems.findIndex(item => item.key === key);
                        if (itemIndex !== -1) {
                            newItems[itemIndex] = { ...newItems[itemIndex], value: value as string };
                        }
                    }
                }
                return newItems;
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'テーマ分析中にエラーが発生しました。');
        } finally {
            setStatus('idle');
        }
    };

    const handleSaveChanges = async () => {
        setStatus('saving');
        setError(null);
        try {
            const csvContent = themeToCsv(themeItems);
            const response = await fetch('/api/save_theme_settings.php', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: csvContent,
            });
            const responseData = await response.json();
            if (!response.ok || !responseData.success) throw new Error(responseData.message || '保存に失敗しました。');
            setOriginalItems(JSON.parse(JSON.stringify(themeItems)));
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
        } finally {
            setStatus('idle');
        }
    };

    const handleExportTheme = () => {
        try {
            const csvContent = themeToCsv(themeItems);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "theme_settings.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError("テーマのエクスポートに失敗しました。");
            console.error(err);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) throw new Error("ファイルが空です。");
                const importedItems = parseThemeCsv(text);
                if (!importedItems.some(item => item.key === 'primary_color')) {
                    throw new Error("無効なテーマファイル形式です。");
                }
                setThemeItems(importedItems);
            } catch (err) {
                setError(err instanceof Error ? err.message : "テーマのインポートに失敗しました。");
                console.error(err);
            }
        };
        reader.onerror = () => setError("ファイルの読み込みに失敗しました。");
        reader.readAsText(file);
        event.target.value = '';
    };

    const isLoading = status !== 'idle';

    if (loading) return <div className="p-8 flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin mr-2 text-2xl"></i>読み込み中...</div>;
    if (error) return <div className="p-8 text-red-600">エラー: {error}</div>;

    return (
        <div className="flex h-screen bg-gray-100 font-sans relative">
            {isLocked && <LockedOverlay />}
            <div className="w-1/3 flex flex-col h-screen border-r bg-white">
                <div className="p-4 border-b flex-shrink-0"><h2 className="text-xl font-bold">AIテーマ生成</h2></div>
                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-700">1. 適用範囲とキーワード</h3>
                        <form onSubmit={handleSearch} className="space-y-3">
                            <div>
                                <label htmlFor="page-select" className="text-sm">適用対象ページ</label>
                                <select id="page-select" value={activePage} onChange={e => setActivePage(e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                                    {pageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="theme-search" className="text-sm">デザインのキーワード</label>
                                <div className="flex gap-2 mt-1">
                                    <input type="text" id="theme-search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="例:未来的, かわいい, ミニマル" className="w-full p-2 border rounded-md" />
                                    <button type="submit" disabled={isLoading} className="bg-primary text-white font-bold px-4 rounded disabled:bg-gray-400">
                                        {status === 'searching' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-700">2. デザイン案の選択と適用</h3>
                        {status === 'searching' && <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-primary"></i><p className="mt-2 text-sm">デザイン案を生成中...</p></div>}
                        {generatedImages.length > 0 && (
                            <div className="space-y-3">
                                <div className="text-sm">
                                    <p className="font-medium mb-2">クリック時の適用オプション:</p>
                                    <div className="flex gap-4">
                                        {Object.entries({colors: '配色', fonts: 'フォント', layout: 'レイアウト提案'}).map(([key, label]) => (
                                            <label key={key} className="flex items-center gap-1.5"><input type="checkbox" checked={(applyOptions as any)[key]} onChange={e => setApplyOptions(p => ({...p, [key]: e.target.checked}))} />{label}</label>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {generatedImages.map((img, i) => (
                                        <button key={i} onClick={() => handleImageSelect(img)} disabled={status === 'analyzing'} className="border-2 border-transparent hover:border-secondary focus:border-secondary transition-all relative group">
                                            <img src={img} alt={`Generated Theme ${i + 1}`} className="w-full h-auto object-cover" />
                                            {status === 'analyzing' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><i className="fas fa-spinner fa-spin text-white text-2xl"></i></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {layoutSuggestion && (
                         <div className="space-y-3 animate-fade-in-up">
                            <h3 className="font-semibold text-gray-700">3. AIからのレイアウト提案</h3>
                            <textarea readOnly value={layoutSuggestion} rows={5} className="w-full p-2 border bg-gray-50 rounded-md font-mono text-xs" />
                        </div>
                    )}
                </div>
                <div className="p-4 border-t flex-shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <button onClick={handleImportClick} disabled={isLoading} className="text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition-colors">
                                <i className="fas fa-upload mr-2"></i>インポート
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                            <button onClick={handleExportTheme} disabled={isLoading} className="text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition-colors ml-2">
                                <i className="fas fa-download mr-2"></i>エクスポート
                            </button>
                        </div>
                        <button onClick={handleSaveChanges} disabled={isLoading || !isDirty} className="bg-secondary text-white font-bold py-3 px-6 rounded-md shadow-sm disabled:bg-gray-400">
                            {status === 'saving' ? '保存中...' : '変更を保存'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                </div>
            </div>
            <div className="w-2/3 h-screen bg-white">
                 <div className="p-2 bg-gray-800 text-white text-sm text-center sticky top-0 z-10">ライブプレビュー</div>
                <iframe ref={iframeRef} src="/" title="Theme Preview" className="w-full h-full border-0" />
            </div>
        </div>
    );
};

export default ThemeGenerator;