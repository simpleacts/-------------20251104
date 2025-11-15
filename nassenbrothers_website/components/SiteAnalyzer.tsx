import React, { useState } from 'react';
import { Type } from "@google/genai";

type AnalysisResult = {
    goodPoints: string[];
    badPoints: string[];
    overallEvaluation: string;
    suggestedImprovements: {
        title: string;
        description: string;
    }[];
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
const SiteAnalyzer: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const response = await fetch('/templates/access_log.csv');
            if (!response.ok) {
                throw new Error('アクセスログファイルの読み込みに失敗しました。');
            }
            const accessLogCsv = await response.text();

            const prompt = `あなたは優秀なWebサイト分析コンサルタントです。以下のWebサイトのアクセスログ(CSV形式)を分析し、サイトの現状と改善点を報告してください。

分析の観点：
- ユーザーがどのページに興味を持っているか
- ユーザーはどこから来ているか (流入元)
- どのページで離脱している可能性があるか
- モバイルとデスクトップの利用比率

報告書には以下の項目を必ず含めてください：
1. **サイトの良い点**: ユーザー行動から読み取れるポジティブな要素。
2. **サイトの悪い点**: 改善が必要だと思われるネガティブな要素。
3. **総合評価**: 全体的なパフォーマンスに関する簡潔な評価。
4. **具体的な改善提案**: 分析結果に基づいた、次に行うべきアクションを3つ提案してください。

アクセスログデータ:
---
${accessLogCsv}
---
`;

            const payload = {
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            goodPoints: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "サイトの良い点を箇条書きでリストアップします。"
                            },
                            badPoints: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "サイトの悪い点・改善点を箇条書きでリストアップします。"
                            },
                            overallEvaluation: {
                                type: Type.STRING,
                                description: "サイト全体のパフォーマンスに関する簡潔な評価です。"
                            },
                            suggestedImprovements: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING, description: "改善提案のタイトル" },
                                        description: { type: Type.STRING, description: "改善提案の具体的な説明" }
                                    }
                                },
                                description: "具体的な改善提案を3つリストアップします。"
                            }
                        }
                    }
                }
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
            setAnalysisResult(JSON.parse(jsonString.trim()));

        } catch (err) {
            console.error("Analysis failed:", err);
            setError(err instanceof Error ? err.message : '分析中に不明なエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="bg-white p-4 border-b sticky top-0 z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">AIサイトアナライザー</h2>
                        <p className="text-sm text-gray-500">アクセスログを元にAIがサイトを分析し、改善点を提案します。</p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {!analysisResult && !isLoading && (
                    <div className="text-center bg-white p-8 shadow-md border rounded-lg">
                        <i className="fas fa-chart-line text-4xl text-primary mb-4"></i>
                        <h3 className="text-xl font-bold mb-2">サイト分析を開始します</h3>
                        <p className="text-gray-600 mb-6">ボタンをクリックすると、AIがアクセスログ（サンプル）を分析します。</p>
                        <button onClick={handleAnalyze} className="bg-primary text-white font-bold py-3 px-8 text-lg hover:bg-primary/90 transition-transform transform hover:scale-105">
                            解析開始
                        </button>
                    </div>
                )}
                
                {isLoading && (
                    <div className="text-center p-8">
                         <div className="inline-block w-12 h-12 border-4 border-t-transparent border-primary rounded-full animate-spin mb-4"></div>
                         <p className="text-gray-600">AIがアクセスログを分析中です...</p>
                    </div>
                )}

                {error && <div className="p-4 text-red-700 bg-red-100 border border-red-300 rounded-md">{error}</div>}

                {analysisResult && (
                    <div className="space-y-6 animate-fade-in-up">
                        <AnalysisCard icon="fa-thumbs-up" title="サイトの良い点" color="green">
                            <ul className="list-disc list-inside space-y-2">
                                {analysisResult.goodPoints.map((point, i) => <li key={i}>{point}</li>)}
                            </ul>
                        </AnalysisCard>

                        <AnalysisCard icon="fa-thumbs-down" title="サイトの悪い点" color="red">
                            <ul className="list-disc list-inside space-y-2">
                                {analysisResult.badPoints.map((point, i) => <li key={i}>{point}</li>)}
                            </ul>
                        </AnalysisCard>
                        
                         <AnalysisCard icon="fa-clipboard-check" title="総合評価" color="blue">
                            <p>{analysisResult.overallEvaluation}</p>
                        </AnalysisCard>

                        <AnalysisCard icon="fa-lightbulb" title="具体的な改善提案" color="yellow">
                            <div className="space-y-4">
                                {analysisResult.suggestedImprovements.map((item, i) => (
                                    <div key={i} className="p-3 bg-yellow-50/50 border-l-4 border-yellow-400">
                                        <h4 className="font-bold">{item.title}</h4>
                                        <p className="text-sm">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </AnalysisCard>

                        <div className="text-center mt-8">
                            <button onClick={handleAnalyze} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 hover:bg-gray-300 transition-colors">
                                <i className="fas fa-sync-alt mr-2"></i>
                                再分析する
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AnalysisCard: React.FC<{ icon: string; title: string; color: 'green' | 'red' | 'blue' | 'yellow'; children: React.ReactNode; }> = ({ icon, title, color, children }) => {
    const colorClasses = {
        green: 'border-green-500 text-green-700',
        red: 'border-red-500 text-red-700',
        blue: 'border-blue-500 text-blue-700',
        yellow: 'border-yellow-500 text-yellow-700',
    };
    const iconColor = {
        green: 'text-green-500',
        red: 'text-red-500',
        blue: 'text-blue-500',
        yellow: 'text-yellow-500',
    }

    return (
        <div className={`bg-white p-6 shadow-md border-l-4 ${colorClasses[color]}`}>
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-3 ${colorClasses[color]}`}>
                <i className={`fas ${icon} ${iconColor[color]}`}></i>
                {title}
            </h3>
            <div className="text-gray-700">
                {children}
            </div>
        </div>
    );
};

export default SiteAnalyzer;