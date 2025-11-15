import React, { useState, useEffect, useCallback } from 'react';
import { Type } from "@google/genai";

type ProductMaster = { id: string; name: string; variantName: string; };
type GeneratedPost = { copy: string; hashtags: string[]; };
type GeneratedAd = { headline: string; description: string; };

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

const MarketingContentGenerator: React.FC = () => {
    const [products, setProducts] = useState<ProductMaster[]>([]);
    
    // SNS
    const [snsProduct, setSnsProduct] = useState('');
    const [snsTarget, setSnsTarget] = useState('10代～20代の若者');
    const [snsTone, setSnsTone] = useState('楽しい');
    const [snsPosts, setSnsPosts] = useState<GeneratedPost[]>([]);
    const [isGeneratingSns, setIsGeneratingSns] = useState(false);

    // Ads
    const [adProduct, setAdProduct] = useState('');
    const [adPlatform, setAdPlatform] = useState('Google');
    const [adTarget, setAdTarget] = useState('文化祭のクラスTシャツを探している高校生');
    const [ads, setAds] = useState<GeneratedAd[]>([]);
    const [isGeneratingAds, setIsGeneratingAds] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [productsMasterRes, productDetailsRes] = await Promise.all([
                fetch('/templates/products_master.csv'),
                fetch('/templates/product_details.csv'),
            ]);
            const productsMasterCsv = await productsMasterRes.text();
            const productDetailsCsv = await productDetailsRes.text();
            
            const masters = parseCsv<{id: string}>(productsMasterCsv);
            const details = parseCsv<{product_id: string, name: string, variantName: string}>(productDetailsCsv);
            
            const productList = masters.map(master => {
                const detail = details.find(d => d.product_id === master.id);
                return { id: master.id, name: detail?.name || 'N/A', variantName: detail?.variantName || '' };
            });
            setProducts(productList);
            if (productList.length > 0) {
                setSnsProduct(productList[0].id);
                setAdProduct(productList[0].id);
            }
        } catch (e) {
            setError('商品データの読み込みに失敗しました。');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerateSns = async () => {
        setIsGeneratingSns(true);
        setError(null);
        setSnsPosts([]);
        try {
            const product = products.find(p => p.id === snsProduct);
            const prompt = `あなたはプロのSNSマーケターです。商品「${product?.name}」をターゲット「${snsTarget}」に向けて、「${snsTone}」雰囲気で宣伝するInstagramの投稿文を3パターン作成してください。各投稿には、感情に訴えかけるキャッチコピーと、適切な日本語のハッシュタグを5つ含めてください。`;
            const payload = {
                model: 'gemini-2.5-flash', contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT, properties: {
                            posts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { copy: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
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
            setSnsPosts(JSON.parse(jsonString.trim()).posts || []);
        } catch (e) { setError(e instanceof Error ? e.message : 'SNS投稿の生成中にエラー'); } finally { setIsGeneratingSns(false); }
    };
    
    const handleGenerateAds = async () => {
        setIsGeneratingAds(true);
        setError(null);
        setAds([]);
        try {
            const product = products.find(p => p.id === adProduct);
            const prompt = `あなたはプロの広告コピーライターです。商品「${product?.name}」をターゲット「${adTarget}」に向けて、「${adPlatform}広告」で出稿するための広告見出し（30文字以内）と説明文（90文字以内）のペアを3パターン作成してください。`;
            const payload = {
                model: 'gemini-2.5-flash', contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT, properties: {
                            ads: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { headline: { type: Type.STRING }, description: { type: Type.STRING } } } }
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
            setAds(JSON.parse(jsonString.trim()).ads || []);
        } catch (e) { setError(e instanceof Error ? e.message : '広告コピーの生成中にエラー'); } finally { setIsGeneratingAds(false); }
    };

    return (
         <div>
            <div className="bg-white p-4 border-b sticky top-0 z-10"><h2 className="text-xl font-bold">マーケティングコンテンツ自動生成</h2></div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Section title="SNS投稿生成 (Instagram)">
                    <SelectInput label="商品" value={snsProduct} onChange={setSnsProduct} options={products} />
                    <TextInput label="ターゲット層" value={snsTarget} onChange={setSnsTarget} />
                    <SelectInput label="投稿の雰囲気" value={snsTone} onChange={setSnsTone} options={['楽しい', 'クール', 'プロフェッショナル', '感動的', '面白い']} />
                    <button onClick={handleGenerateSns} disabled={isGeneratingSns} className="w-full bg-primary text-white font-bold py-2 px-6 rounded disabled:bg-gray-400">
                        {isGeneratingSns ? <><i className="fas fa-spinner fa-spin mr-2"></i>生成中...</> : '投稿を生成'}
                    </button>
                    {snsPosts.length > 0 && <div className="mt-4 space-y-3">{snsPosts.map((p, i) => <ResultCard key={i} title={`投稿案 ${i+1}`} content={p.copy} tags={p.hashtags} />)}</div>}
                </Section>
                <Section title="広告コピー生成">
                    <SelectInput label="商品" value={adProduct} onChange={setAdProduct} options={products} />
                    <SelectInput label="広告媒体" value={adPlatform} onChange={setAdPlatform} options={['Google', 'Instagram', 'X (Twitter)', 'Facebook']} />
                    <TextInput label="ターゲット層" value={adTarget} onChange={setAdTarget} />
                    <button onClick={handleGenerateAds} disabled={isGeneratingAds} className="w-full bg-primary text-white font-bold py-2 px-6 rounded disabled:bg-gray-400">
                        {isGeneratingAds ? <><i className="fas fa-spinner fa-spin mr-2"></i>生成中...</> : '広告コピーを生成'}
                    </button>
                    {ads.length > 0 && <div className="mt-4 space-y-3">{ads.map((ad, i) => <ResultCard key={i} title={`見出し: ${ad.headline}`} content={`説明文: ${ad.description}`} />)}</div>}
                </Section>
                {error && <p className="lg:col-span-2 text-sm text-red-600 text-center">{error}</p>}
            </div>
        </div>
    );
};

// --- Form & Result Components ---
const SelectInput: React.FC<{ label: string; value: string; onChange: (val: string) => void; options: (ProductMaster | string)[] }> = ({ label, value, onChange, options }) => (
    <div>
        <label className="text-sm font-medium">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 border rounded-md mt-1">
            {options.map(opt => typeof opt === 'string' ? <option key={opt} value={opt}>{opt}</option> : <option key={opt.id} value={opt.id}>{opt.name} {opt.variantName}</option>)}
        </select>
    </div>
);
const TextInput: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="text-sm font-medium">{label}</label>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
    </div>
);
const ResultCard: React.FC<{ title: string; content: string; tags?: string[] }> = ({ title, content, tags }) => (
    <div className="bg-gray-50 border p-3 rounded-lg relative animate-fade-in-up">
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{content}</p>
        {tags && <div className="flex flex-wrap gap-1 mt-2">{tags.map(t => <span key={t} className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">{t}</span>)}</div>}
        <button onClick={() => navigator.clipboard.writeText(content)} className="absolute top-2 right-2 text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">コピー</button>
    </div>
);

const parseCsv = <T extends object>(csvText: string): T[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => { (obj as any)[header] = values[index]?.trim(); return obj; }, {} as T);
  });
};

export default MarketingContentGenerator;