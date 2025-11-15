import React, { useState, useEffect, useCallback } from 'react';
import { Type } from "@google/genai";

type Review = { productId: string; productName: string; rating: string; reviewText: string; };
type Inquiry = { date: string; inquiryText: string; };
type ReviewSummary = { positiveSummary: string[]; negativeSummary: string[]; improvementSuggestions: string[]; };
type FaqSuggestion = { question: string; answer: string; };

const callGeminiProxy = async (payload: object): Promise<any> => {
    const response = await fetch('/api/gemini_proxy.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'AI Proxy Error');
    }
    return response.json();
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 shadow-md border rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const CustomerExperienceEnhancer: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Review Summary
    const [isSummarizingReviews, setIsSummarizingReviews] = useState(false);
    const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);

    // FAQ Suggestions
    const [isSuggestingFaqs, setIsSuggestingFaqs] = useState(false);
    const [faqSuggestions, setFaqSuggestions] = useState<FaqSuggestion[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [reviewsRes, inquiriesRes] = await Promise.all([
                fetch('/templates/product_reviews.csv'),
                fetch('/templates/customer_inquiries.csv'),
            ]);
            const reviewsCsv = await reviewsRes.text();
            const inquiriesCsv = await inquiriesRes.text();

            setReviews(parseCsv<Review>(reviewsCsv));
            setInquiries(parseCsv<Inquiry>(inquiriesCsv));
        } catch (e) {
            setError('サンプルデータの読み込みに失敗しました。');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSummarizeReviews = async () => {
        setIsSummarizingReviews(true);
        setError(null);
        setReviewSummary(null);
        try {
            const reviewsCsvString = arrayToCsv(reviews, ['productName', 'rating', 'reviewText']);
            const prompt = `あなたは顧客体験(CX)の専門家です。以下の商品レビューデータを分析し、ポジティブな意見、ネガティブな意見、そして具体的な改善提案の3つのカテゴリーで要点をまとめてください。\n\nレビューデータ:\n---\n${reviewsCsvString}\n---`;
            const payload = {
                model: 'gemini-2.5-flash', contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT, properties: {
                            positiveSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
                            negativeSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
                            improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
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
            setReviewSummary(JSON.parse(jsonString.trim()));
        } catch (e) { setError(e instanceof Error ? e.message : 'レビュー要約中にエラー'); } finally { setIsSummarizingReviews(false); }
    };
    
    const handleSuggestFaqs = async () => {
        setIsSuggestingFaqs(true);
        setError(null);
        setFaqSuggestions([]);
        try {
            const inquiriesCsvString = arrayToCsv(inquiries, ['inquiryText']);
            const prompt = `あなたはカスタマーサポートのリーダーです。以下の顧客からの問い合わせ内容を分析し、頻繁に寄せられる質問を特定してください。そして、それらの質問に対するFAQ（よくある質問）の原稿を3〜5個作成してください。各FAQは質問(question)と回答(answer)のペアにしてください。\n\n問い合わせデータ:\n---\n${inquiriesCsvString}\n---`;
            const payload = {
                model: 'gemini-2.5-flash', contents: prompt,
                 config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                answer: { type: Type.STRING },
                            }
                        }
                    }
                }
            };
            const result = await callGeminiProxy(payload);
            const rawText = result.candidates[0]?.content?.parts[0]?.text || '[]';
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
            setFaqSuggestions(JSON.parse(jsonString.trim()));
        } catch (e) { setError(e instanceof Error ? e.message : 'FAQ提案の生成中にエラー'); } finally { setIsSuggestingFaqs(false); }
    };

    return (
        <div>
            <div className="bg-white p-4 border-b sticky top-0 z-10"><h2 className="text-xl font-bold">顧客体験向上アシスタント</h2></div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Section title="商品レビュー要約・分析">
                     <p className="text-sm text-gray-600">全商品レビューをAIが分析し、顧客の声を要約します。</p>
                    <button onClick={handleSummarizeReviews} disabled={isSummarizingReviews} className="w-full bg-primary text-white font-bold py-2 px-6 rounded disabled:bg-gray-400">
                        {isSummarizingReviews ? <><i className="fas fa-spinner fa-spin mr-2"></i>要約中...</> : 'レビューを要約'}
                    </button>
                     {reviewSummary && (
                        <div className="mt-4 space-y-4 animate-fade-in-up">
                            <ResultList title="ポジティブな意見" icon="fa-smile" items={reviewSummary.positiveSummary} color="green" />
                            <ResultList title="ネガティブな意見" icon="fa-frown" items={reviewSummary.negativeSummary} color="red" />
                            <ResultList title="改善提案" icon="fa-lightbulb" items={reviewSummary.improvementSuggestions} color="blue" />
                        </div>
                    )}
                </Section>
                <Section title="FAQ更新提案">
                    <p className="text-sm text-gray-600">顧客からの問い合わせ内容をAIが分析し、FAQの追加・更新案を提案します。</p>
                    <button onClick={handleSuggestFaqs} disabled={isSuggestingFaqs} className="w-full bg-primary text-white font-bold py-2 px-6 rounded disabled:bg-gray-400">
                        {isSuggestingFaqs ? <><i className="fas fa-spinner fa-spin mr-2"></i>提案作成中...</> : 'FAQを提案'}
                    </button>
                     {faqSuggestions.length > 0 && (
                        <div className="mt-4 space-y-3 animate-fade-in-up">
                            {faqSuggestions.map((faq, i) => (
                                <details key={i} className="bg-gray-50 p-3 rounded-lg border">
                                    <summary className="font-semibold text-gray-800 cursor-pointer">Q: {faq.question}</summary>
                                    <p className="text-sm text-gray-600 mt-2 pt-2 border-t">{faq.answer}</p>
                                </details>
                            ))}
                        </div>
                    )}
                </Section>
                {error && <p className="lg:col-span-2 text-sm text-red-600 text-center">{error}</p>}
            </div>
        </div>
    );
};

const ResultList: React.FC<{ title: string; icon: string; items: string[]; color: string; }> = ({ title, icon, items, color }) => (
    <div className={`p-4 border-l-4 border-${color}-500 bg-${color}-50`}>
        <h4 className={`font-bold text-${color}-800 flex items-center mb-2`}><i className={`fas ${icon} mr-2`}></i>{title}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    </div>
);

// CSVパーサー関数
const parseCsv = <T extends object>(csvText: string): T[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => { (obj as any)[header] = values[index]?.trim(); return obj; }, {} as T);
  });
};
const arrayToCsv = (data: any[], headers: string[]): string => {
    const csvRows = [headers.join(',')];
    data.forEach(item => { csvRows.push(headers.map(header => `"${item[header].replace(/"/g, '""')}"`).join(',')); });
    return csvRows.join('\n');
};

export default CustomerExperienceEnhancer;