import { useState, useEffect } from 'react';
import { Product, Recommendation } from '../types';

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

export const useRecommendations = (products: Record<string, Product[]>) => {
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const allProducts = Object.values(products).flat();
                if (allProducts.length === 0) {
                    setIsLoading(false);
                    return;
                }

                const productList = allProducts.slice(0, 10).map(p => `- ${p.name} (ID: ${p.id})`).join('\n');
                
                const prompt = `以下の商品リストを参考に、ユーザーに人気がありそうなおすすめ商品を5つ提案してください。提案にはキャッチーなタイトルと、なぜそれをおすすめするのかの簡単な理由を添えてください。レスポンスはJSON形式で、以下のキーのみを含めてください: "title" (string), "reason" (string), "productIds" (string[])`;

                const payload = {
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                };

                const result = await callGeminiProxy(payload);
                const rawText = result.candidates[0]?.content?.parts[0]?.text;
                
                if (rawText) {
                    try {
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
                        const parsedResult: Recommendation = JSON.parse(jsonString.trim());
                        
                        // Make sure productIds exist in the product list
                        parsedResult.productIds = parsedResult.productIds.filter(id => allProducts.some(p => p.id === id));
                        setRecommendation(parsedResult);
                    } catch (e) {
                        console.error("Failed to parse recommendation JSON:", e, "Raw text:", rawText);
                        setRecommendation(null);
                    }
                } else {
                    setRecommendation(null);
                }

            } catch (error) {
                console.error("Failed to fetch recommendations:", error);
                setRecommendation(null);
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if products are available
        if (Object.keys(products).length > 0) {
            fetchRecommendations();
        } else {
            setIsLoading(false);
        }
    }, [products]);

    return { recommendation, isLoading };
};