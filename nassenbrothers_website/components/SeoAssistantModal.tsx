import React, { useState, useEffect, useCallback } from 'react';
import { Type } from "@google/genai";

interface SeoAssistantModalProps {
    articleData: {
        title: string;
        content: string;
        excerpt: string;
        published_date?: string;
        [key: string]: any;
    };
    onUpdateField: (field: string, value: string) => void;
    onClose: () => void;
}

type ActiveTab = 'keywords' | 'meta' | 'expand' | 'schema';
type KeywordResults = {
    mainKeywords: string[];
    longTailKeywords: string[];
    lsiKeywords: string[];
};
type MetaTagResults = {
    title: string;
    description: string;
}[];
type FaqResults = {
    question: string;
    answer: string;
}[];

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


export const SeoAssistantModal: React.FC<SeoAssistantModalProps> = ({ articleData, onUpdateField, onClose }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('keywords');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [keywordResults, setKeywordResults] = useState<KeywordResults | null>(null);
    const [metaTagResults, setMetaTagResults] = useState<MetaTagResults | null>(null);
    const [faqResults, setFaqResults] = useState<FaqResults | null>(null);
    const [schemaResults, setSchemaResults] = useState<{ article: string; faq: string } | null>(null);
    
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);
    
    const combinedContentForKeywords = `タイトル: ${articleData.title}\n\n本文:\n${articleData.content}`;
    const combinedContentForMeta = `タイトル: ${articleData.title}\n\n抜粋:\n${articleData.excerpt}`;

    const extractJsonFromText = (text: string | undefined, fallback: string): string => {
        if (!text) return fallback;
        let jsonString = text;
        const markdownMatch = text.match(/```(json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[2]) {
            jsonString = markdownMatch[2];
        } else {
            const firstBracket = text.indexOf('[');
            const firstBrace = text.indexOf('{');
            if (firstBracket !== -1 || firstBrace !== -1) {
                const start = (firstBracket === -1) ? firstBrace : (firstBrace === -1) ? firstBracket : Math.min(firstBracket, firstBrace);
                const lastBracket = text.lastIndexOf(']');
                const lastBrace = text.lastIndexOf('}');
                const end = Math.max(lastBracket, lastBrace);
                if (end > start) {
                    jsonString = text.substring(start, end + 1);
                }
            }
        }
        return jsonString.trim();
    };

    const handleAnalyzeKeywords = async () => {
        setIsLoading(true);
        setError('');
        try {
            const prompt = `以下のブログ記事の内容を分析し、SEOに最適なキーワードを提案してください。提案は以下の3つのカテゴリーに分けて、それぞれ箇条書きでリストアップしてください。\n1. メインキーワード (5つ)\n2. ロングテールキーワード (5つ)\n3. 関連質問 (LSIキーワード) (5つ)\n\n---\n${combinedContentForKeywords}`;
            
            const payload = { model: 'gemini-2.5-flash', contents: prompt };
            const result = await callGeminiProxy(payload);
            const text = result.candidates[0]?.content?.parts[0]?.text || '';
            
            const parseList = (header: string): string[] => {
                const regex = new RegExp(`${header}[\\s\\S]*?(?=\\n\\n|\\n[0-9]+\\.)`, 'i');
                const match = text.match(regex);
                return match ? match[0].split('\n').slice(1).map(s => s.replace(/^- |^[0-9]+\. /g, '').trim()).filter(Boolean) : [];
            };
            
            setKeywordResults({
                mainKeywords: parseList('1. メインキーワード'),
                longTailKeywords: parseList('2. ロングテールキーワード'),
                lsiKeywords: parseList('3. 関連質問'),
            });

        } catch (e) {
            setError('キーワード分析中にエラーが発生しました。');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateMetaTags = async () => {
        setIsLoading(true);
        setError('');
        try {
            const prompt = `以下のブログ記事のタイトルと抜粋を元に、検索エンジンのクリック率(CTR)を最大化するような、SEOに最適化されたメタタイトルとメタディスクリプションのペアを3つ提案してください。\n\n- メタタイトルは日本語で30文字以内\n- メタディスクリプションは日本語で120文字以内\n- ユーザーの興味を引き、クリックを促すような魅力的なコピーにしてください。\n\n---\n${combinedContentForMeta}`;
            
            const payload = {
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                            },
                        },
                    },
                },
            };
            const result = await callGeminiProxy(payload);
            const jsonString = extractJsonFromText(result.candidates[0]?.content?.parts[0]?.text, '[]');
            setMetaTagResults(JSON.parse(jsonString));
        } catch(e) {
            setError('メタタグ生成中にエラーが発生しました。');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSuggestExpansion = async () => {
        setIsLoading(true);
        setError('');
        try {
            const prompt = `以下のブログ記事の内容を分析し、この記事の網羅性と専門性を高めるためのFAQ(よくある質問)セクションを生成してください。読者が抱きそうな疑問を予測し、3〜5個の質問とそれに対する簡潔な回答を作成してください。\n\n---\n${combinedContentForKeywords}`;
            
            const payload = {
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                answer: { type: Type.STRING },
                            },
                        },
                    },
                },
            };
            const result = await callGeminiProxy(payload);
            const jsonString = extractJsonFromText(result.candidates[0]?.content?.parts[0]?.text, '[]');
            setFaqResults(JSON.parse(jsonString));
        } catch(e) {
            setError('コンテンツ拡張の提案中にエラーが発生しました。');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSchema = async () => {
        if (!faqResults) {
            alert('先に「コンテンツ拡張」でFAQを生成してください。');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const articlePrompt = `以下の記事情報から、ArticleスキーマのJSON-LDを生成してください。\n- headline: ${articleData.title}\n- description: ${articleData.excerpt}\n- datePublished: ${articleData.published_date || new Date().toISOString().split('T')[0]}\n- authorとpublisherは「捺染兄弟」に設定してください。`;
            const faqPrompt = `以下のFAQリストから、FAQPageスキーマのJSON-LDを生成してください。\n\n${faqResults.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n')}`;
            
            const articlePayload = { model: 'gemini-2.5-flash', contents: articlePrompt, config: { responseMimeType: "application/json" } };
            const faqPayload = { model: 'gemini-2.5-flash', contents: faqPrompt, config: { responseMimeType: "application/json" } };

            const [articleResult, faqResult] = await Promise.all([callGeminiProxy(articlePayload), callGeminiProxy(faqPayload)]);
            
            const articleJsonString = extractJsonFromText(articleResult.candidates[0]?.content?.parts[0]?.text, '{}');
            const faqJsonString = extractJsonFromText(faqResult.candidates[0]?.content?.parts[0]?.text, '{}');

            setSchemaResults({
                article: JSON.stringify(JSON.parse(articleJsonString), null, 2),
                faq: JSON.stringify(JSON.parse(faqJsonString), null, 2),
            });
        } catch (e) {
            setError('構造化データの生成中にエラーが発生しました。');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const TabButton: React.FC<{ tabId: ActiveTab; label: string; icon: string; }> = ({ tabId, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === tabId ? 'bg-secondary/10 text-secondary border-b-2 border-secondary' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <i className={`fas ${icon}`}></i>
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white shadow-2xl w-full max-w-4xl animate-fade-in-up flex flex-col max-h-[90vh]">
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <i className="fas fa-rocket text-purple-600"></i>SEO Power-Up アシスタント
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 text-2xl" aria-label="閉じる">&times;</button>
                </header>
                <div className="border-b flex">
                    <TabButton tabId="keywords" label="キーワード分析" icon="fa-key" />
                    <TabButton tabId="meta" label="メタタグ最適化" icon="fa-tags" />
                    <TabButton tabId="expand" label="コンテンツ拡張" icon="fa-comment-dots" />
                    <TabButton tabId="schema" label="構造化データ" icon="fa-code" />
                </div>
                <main className="p-6 overflow-y-auto bg-gray-50 flex-grow">
                    {activeTab === 'keywords' && (
                        <div className="space-y-4">
                            <button onClick={handleAnalyzeKeywords} disabled={isLoading} className="w-full bg-primary text-white font-bold p-2 rounded disabled:bg-gray-400">
                                {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>分析中...</> : '現在の記事からキーワードを分析'}
                            </button>
                            {keywordResults && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                                    <KeywordList title="メインキーワード" keywords={keywordResults.mainKeywords} />
                                    <KeywordList title="ロングテールキーワード" keywords={keywordResults.longTailKeywords} />
                                    <KeywordList title="関連質問 (LSI)" keywords={keywordResults.lsiKeywords} />
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'meta' && (
                        <div className="space-y-4">
                            <button onClick={handleGenerateMetaTags} disabled={isLoading} className="w-full bg-primary text-white font-bold p-2 rounded disabled:bg-gray-400">
                                 {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>生成中...</> : 'メタタグを3パターン生成'}
                            </button>
                            {metaTagResults && metaTagResults.map((meta, index) => (
                                <div key={index} className="bg-white p-4 border rounded animate-fade-in-up">
                                    <p className="font-semibold text-secondary">{meta.title}</p>
                                    <p className="text-sm text-gray-600 mt-1">{meta.description}</p>
                                    <button onClick={() => { onUpdateField('title', meta.title); onUpdateField('excerpt', meta.description); }} className="text-xs bg-secondary/20 text-secondary font-semibold py-1 px-3 mt-2 hover:bg-secondary/30">この内容を適用</button>
                                </div>
                            ))}
                        </div>
                    )}
                     {activeTab === 'expand' && (
                        <div className="space-y-4">
                            <button onClick={handleSuggestExpansion} disabled={isLoading} className="w-full bg-primary text-white font-bold p-2 rounded disabled:bg-gray-400">
                                {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>生成中...</> : 'FAQセクションを生成'}
                            </button>
                            {faqResults && <FaqDisplay faqs={faqResults} onUpdateField={onUpdateField} articleContent={articleData.content} />}
                        </div>
                    )}
                     {activeTab === 'schema' && (
                        <div className="space-y-4">
                             <button onClick={handleGenerateSchema} disabled={isLoading || !faqResults} className="w-full bg-primary text-white font-bold p-2 rounded disabled:bg-gray-400" title={!faqResults ? '先にコンテンツ拡張タブでFAQを生成してください' : ''}>
                                {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>生成中...</> : '構造化データ(JSON-LD)を生成'}
                            </button>
                            {schemaResults && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                                    <SchemaDisplay title="Article Schema" schema={schemaResults.article} />
                                    <SchemaDisplay title="FAQPage Schema" schema={schemaResults.faq} />
                                </div>
                            )}
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}
                </main>
            </div>
        </div>
    );
};

const KeywordList: React.FC<{ title: string; keywords: string[]; }> = ({ title, keywords }) => (
    <div className="bg-white p-4 border rounded">
        <h4 className="font-bold text-gray-800 mb-2">{title}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            {keywords.map((kw, i) => <li key={i}>{kw}</li>)}
        </ul>
    </div>
);

const FaqDisplay: React.FC<{ faqs: FaqResults; onUpdateField: (field: string, value: string) => void; articleContent: string; }> = ({ faqs, onUpdateField, articleContent }) => {
    const handleAppend = () => {
        const markdown = faqs.map(faq => `### ${faq.question}\n\n${faq.answer}`).join('\n\n');
        const newContent = articleContent + '\n\n' + markdown;
        onUpdateField('content', newContent);
    };
    return (
        <div className="bg-white p-4 border rounded animate-fade-in-up">
            <h4 className="font-bold text-gray-800 mb-2">生成されたFAQ</h4>
            <div className="prose prose-sm max-w-none">
                {faqs.map((faq, i) => (
                    <details key={i} className="mb-2">
                        <summary className="font-semibold cursor-pointer">{faq.question}</summary>
                        <p className="mt-1">{faq.answer}</p>
                    </details>
                ))}
            </div>
             <button onClick={handleAppend} className="text-xs bg-secondary/20 text-secondary font-semibold py-1 px-3 mt-4 hover:bg-secondary/30">記事の末尾に追記</button>
        </div>
    );
};

const SchemaDisplay: React.FC<{ title: string; schema: string }> = ({ title, schema }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(schema);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="bg-white p-4 border rounded">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-800">{title}</h4>
                <button onClick={handleCopy} className="text-xs bg-gray-200 hover:bg-gray-300 p-1 rounded">
                    {copied ? <><i className="fas fa-check text-green-500 mr-1"></i>コピー完了</> : <><i className="fas fa-copy mr-1"></i>コピー</>}
                </button>
            </div>
            <pre className="text-xs bg-gray-900 text-white p-2 rounded overflow-x-auto">
                <code>{schema}</code>
            </pre>
        </div>
    );
};