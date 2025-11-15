import React, { useState, useEffect, useCallback } from 'react';
import { Type } from "@google/genai";

type SalesData = { productId: string; productName: string; date: string; quantity: string; price: string; };
type ProductMaster = { id: string; name: string; variantName: string; };
type AnalysisResult = { trendAnalysis: string; topProductFeatures: string[]; actionPlans: { title: string; description: string; }[]; };

// AIプロキシを呼び出す共通関数
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

const SalesStrategyOptimizer: React.FC = () => {
    const [salesData, setSalesData] = useState<SalesData[]>([]);
    const [products, setProducts] = useState<ProductMaster[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    // 商品説明文生成用のState
    const [selectedProductId, setSelectedProductId] = useState('');
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [salesRes, productsMasterRes, productDetailsRes] = await Promise.all([
                fetch('/templates/sales_data.csv'),
                fetch('/templates/products_master.csv'),
                fetch('/templates/product_details.csv'),
            ]);
            const salesCsv = await salesRes.text();
            const productsMasterCsv = await productsMasterRes.text();
            const productDetailsCsv = await productDetailsRes.text();

            setSalesData(parseCsv<SalesData>(salesCsv));
            const masters = parseCsv<{id: string}>(productsMasterCsv);
            const details = parseCsv<{product_id: string, name: string, variantName: string}>(productDetailsCsv);
            
            const productList = masters.map(master => {
                const detail = details.find(d => d.product_id === master.id);
                return {
                    id: master.id,
                    name: detail?.name || 'N/A',
                    variantName: detail?.variantName || ''
                };
            });
            setProducts(productList);
            if (productList.length > 0) {
                setSelectedProductId(productList[0].id);
            }
        } catch (e) {
            setError('サンプルデータの読み込みに失敗しました。');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const salesCsvString = arrayToCsv(salesData, ['productId', 'productName', 'date', 'quantity', 'price']);
            const prompt = `あなたは優秀なECサイトのデータアナリストです。以下の販売データを分析し、来月の販売戦略を提案してください。分析には、売れ筋商品の特徴（商品名、カテゴリなど）、販売トレンドの要約、そして具体的なアクションプランを3つ含めてください。\n\n販売データ:\n---\n${salesCsvString}\n---`;
            
            const payload = {
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            trendAnalysis: { type: Type.STRING, description: "販売トレンドの要約" },
                            topProductFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "売れ筋商品の特徴" },
                            actionPlans: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
                                }
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
        } catch (e) {
            setError(e instanceof Error ? e.message : '分析中にエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateDescription = async () => {
        if (!selectedProductId) return;
        setIsGeneratingDesc(true);
        setGeneratedDescription('');
        try {
            const product = products.find(p => p.id === selectedProductId);
            const prompt = `あなたはプロのコピーライターです。商品「${product?.name} ${product?.variantName}」の魅力を最大限に引き出す、SEOに強く、購買意欲をそそる商品説明文を200文字程度で作成してください。`;
            const payload = { model: 'gemini-2.5-flash', contents: prompt };
            const result = await callGeminiProxy(payload);
            setGeneratedDescription(result.candidates[0]?.content?.parts[0]?.text || '生成に失敗しました。');
        } catch (e) {
             setGeneratedDescription('エラー: ' + (e instanceof Error ? e.message : '不明なエラー'));
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    return (
        <div>
            <div className="bg-white p-4 border-b sticky top-0 z-10"><h2 className="text-xl font-bold">販売戦略最適化</h2></div>
            <div className="p-6 space-y-6">
                <Section title="トレンド分析＆販売戦略提案">
                    <p className="text-sm text-gray-600">サンプル販売データをAIが分析し、ビジネスインサイトを提供します。</p>
                    <button onClick={handleAnalyze} disabled={isLoading} className="bg-primary text-white font-bold py-2 px-6 rounded disabled:bg-gray-400">
                        {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>分析中...</> : '分析を実行'}
                    </button>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {analysisResult && (
                        <div className="mt-4 space-y-4 animate-fade-in-up">
                            <AnalysisResultCard title="販売トレンドの要約" icon="fa-chart-line"><p>{analysisResult.trendAnalysis}</p></AnalysisResultCard>
                            <AnalysisResultCard title="売れ筋商品の特徴" icon="fa-star"><ul className="list-disc list-inside">{analysisResult.topProductFeatures.map((f, i) => <li key={i}>{f}</li>)}</ul></AnalysisResultCard>
                            <AnalysisResultCard title="具体的なアクションプラン" icon="fa-tasks">
                                {analysisResult.actionPlans.map((p, i) => <div key={i} className="mb-2"><h4 className="font-semibold">{p.title}</h4><p className="text-sm">{p.description}</p></div>)}
                            </AnalysisResultCard>
                        </div>
                    )}
                </Section>
                <Section title="商品説明文の自動改善">
                    <p className="text-sm text-gray-600">商品を選択して、AIが生成したキャッチーな商品説明文を取得します。</p>
                    <div className="flex gap-2 items-end">
                        <div className="flex-grow">
                            <label htmlFor="product-select" className="text-sm font-medium">商品</label>
                            <select id="product-select" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-2 border rounded-md mt-1">
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.variantName}</option>)}
                            </select>
                        </div>
                        <button onClick={handleGenerateDescription} disabled={isGeneratingDesc} className="bg-secondary text-white font-bold py-2 px-4 rounded h-10 disabled:bg-gray-400">
                            {isGeneratingDesc ? <i className="fas fa-spinner fa-spin"></i> : '生成'}
                        </button>
                    </div>
                    {generatedDescription && (
                        <div className="mt-4 p-4 bg-gray-50 border rounded-md relative animate-fade-in-up">
                            <textarea value={generatedDescription} readOnly className="w-full h-32 text-sm bg-transparent border-0 focus:ring-0 resize-none" />
                            <button onClick={() => navigator.clipboard.writeText(generatedDescription)} className="absolute top-2 right-2 text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">コピー</button>
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
};

const AnalysisResultCard: React.FC<{ title: string, icon: string, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <h4 className="font-bold text-gray-700 mb-2 flex items-center"><i className={`fas ${icon} mr-2 text-primary`}></i>{title}</h4>
        <div className="text-sm text-gray-600">{children}</div>
    </div>
);

// CSVパーサー関数
const parseCsv = <T extends object>(csvText: string): T[] => {
  const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => { (obj as any)[header] = values[index]?.trim(); return obj; }, {} as T);
  });
};
const arrayToCsv = (data: any[], headers: string[]): string => {
    const csvRows = [headers.join(',')];
    data.forEach(item => { csvRows.push(headers.map(header => item[header]).join(',')); });
    return csvRows.join('\n');
};

export default SalesStrategyOptimizer;