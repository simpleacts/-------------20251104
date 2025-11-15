import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ResearchResult = {
    text: string;
    sources?: { web: { uri: string; title: string } }[];
};

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


// FIX: Changed named export to default export for React.lazy compatibility.
const AiResearchAssistant: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'url' | 'topic'>('url');

    return (
        <div>
            <div className="bg-white p-4 border-b sticky top-0 z-10">
                <h2 className="text-xl font-bold">AIリサーチアシスタント</h2>
                <p className="text-sm text-gray-500">Web上の情報をAIが収集・要約し、コンテンツ作成をサポートします。</p>
            </div>

            <div className="p-4">
                <div className="mb-4 border-b">
                    <nav className="flex space-x-4">
                        <button onClick={() => setActiveTab('url')} className={`px-4 py-2 font-semibold text-sm ${activeTab === 'url' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-500 hover:text-gray-700'}`}>
                            URLから要約
                        </button>
                        <button onClick={() => setActiveTab('topic')} className={`px-4 py-2 font-semibold text-sm ${activeTab === 'topic' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-500 hover:text-gray-700'}`}>
                            トピックをリサーチ
                        </button>
                    </nav>
                </div>

                {activeTab === 'url' ? <UrlSummarizer /> : <TopicResearcher />}
            </div>
        </div>
    );
};

const UrlSummarizer: React.FC = () => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ResearchResult | null>(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSummarize = async () => {
        if (!url) {
            setError('URLを入力してください。');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const proxyResponse = await fetch('/api/fetch_url.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            if (!proxyResponse.ok) {
                const errData = await proxyResponse.json();
                throw new Error(errData.message || 'ページのコンテンツ取得に失敗しました。');
            }
            const { content, title } = await proxyResponse.json();

            if (!content) {
                throw new Error('ページからテキストコンテンツを抽出できませんでした。');
            }

            const payload = {
                model: 'gemini-2.5-flash',
                contents: `以下のWebページの内容を、ブログ記事の参考資料として使えるように、重要なポイントを日本語の箇条書きで要約してください。\n\n記事タイトル: ${title}\n\n---\n${content}`
            };
            
            const geminiResult = await callGeminiProxy(payload);
            const text = geminiResult.candidates[0]?.content?.parts[0]?.text;
            
            setResult({ text: text || '' });
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '要約中にエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateArticle = () => {
        if (!result) return;
        const newArticle = {
            title: `AIによる要約: ${url}`,
            content: result.text,
            excerpt: result.text.substring(0, 100) + '...',
        };
        navigate('/admin/articles', { state: { newArticle } });
    };

    return (
        <div className="bg-white p-6 shadow-md">
            <div className="space-y-4">
                <div>
                    <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-1">要約したいページのURL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            id="url-input"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            className="flex-grow p-2 border border-gray-300 rounded-md"
                            disabled={isLoading}
                        />
                        <button onClick={handleSummarize} disabled={isLoading} className="bg-primary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors disabled:bg-gray-400 enabled:hover:bg-primary/90">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : '要約'}
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {result && <ResultDisplay result={result} onCreateArticle={handleCreateArticle} />}
            </div>
        </div>
    );
};

const TopicResearcher: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ResearchResult | null>(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleResearch = async () => {
        if (!topic) {
            setError('トピックを入力してください。');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const payload = {
                model: 'gemini-2.5-flash',
                contents: `「${topic}」について調査し、ブログ記事で紹介できるような重要なポイントや最新情報を日本語でまとめてください。`,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            };

            const geminiResult = await callGeminiProxy(payload);
            const text = geminiResult.candidates[0]?.content?.parts[0]?.text;
            const rawSources = geminiResult.candidates?.[0]?.groundingMetadata?.groundingChunks;
            
            const sources = rawSources
                ?.filter((chunk: any) => chunk.web?.uri)
                .map((chunk: any) => ({
                    web: {
                        uri: chunk.web!.uri!,
                        title: chunk.web!.title || chunk.web!.uri!,
                    }
                }));

            setResult({ text: text || '', sources: sources });
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'リサーチ中にエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateArticle = () => {
        if (!result) return;
        let content = result.text;
        if (result.sources && result.sources.length > 0) {
            content += '\n\n---\n\n### 参考資料\n';
            result.sources.forEach(source => {
                content += `- [${source.web.title}](${source.web.uri})\n`;
            });
        }
        const newArticle = {
            title: `AIによるリサーチ: ${topic}`,
            content: content,
            excerpt: result.text.substring(0, 100) + '...',
        };
        navigate('/admin/articles', { state: { newArticle } });
    };

    return (
        <div className="bg-white p-6 shadow-md">
            <div className="space-y-4">
                <div>
                    <label htmlFor="topic-input" className="block text-sm font-medium text-gray-700 mb-1">リサーチしたいトピック</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="topic-input"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="例: Tシャツ デザイン トレンド 2024"
                            className="flex-grow p-2 border border-gray-300 rounded-md"
                            disabled={isLoading}
                        />
                        <button onClick={handleResearch} disabled={isLoading} className="bg-primary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors disabled:bg-gray-400 enabled:hover:bg-primary/90">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'リサーチ'}
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {result && <ResultDisplay result={result} onCreateArticle={handleCreateArticle} />}
            </div>
        </div>
    );
};

const ResultDisplay: React.FC<{ result: ResearchResult; onCreateArticle: () => void; }> = ({ result, onCreateArticle }) => (
    <div className="mt-6 border-t pt-4 space-y-4 animate-fade-in-up">
        <h3 className="text-lg font-semibold">生成されたコンテンツ</h3>
        <textarea
            readOnly
            value={result.text}
            className="w-full h-64 p-2 border bg-gray-50 rounded-md font-mono text-sm"
        />
        {result.sources && result.sources.length > 0 && (
            <div>
                <h4 className="font-semibold mb-2">参照元ソース</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.sources.map((source, index) => (
                        <li key={index}>
                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                                {source.web.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <button onClick={onCreateArticle} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors hover:bg-green-700">
            <i className="fas fa-plus-circle mr-2"></i>この記事を元に新規コンテンツを作成
        </button>
    </div>
);

export default AiResearchAssistant;
