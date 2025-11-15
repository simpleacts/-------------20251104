import { Column, Operation, Row, ImageFile, PdfTemplateBlock, IdFormat } from '../types';
import { Email, TriageResult as TriageResultType } from '../../features/email-management/types';

let aiSettings: Map<string, string> = new Map();
let selectedModel: string = 'gemini-2.5-flash'; // デフォルトモデルを明示的に設定
let isInitialized = false;

/**
 * プロキシ経由でGemini APIを呼び出す
 */
const callGeminiProxy = async (endpoint: string, payload: any, model?: string): Promise<{ text: string; candidates?: any }> => {
    const response = await fetch('api/gemini-proxy.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            endpoint,
            payload,
            model: model || selectedModel,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error);
    }

    return data;
};

export const initializeGeminiService = (apiKey: string, settings: Map<string, string>, silent: boolean = false) => {
    aiSettings = settings;
    const modelFromSettings = aiSettings.get('GEMINI_MODEL');
    
    // デフォルト値を明示的に設定
    selectedModel = 'gemini-2.5-flash';
    
    // 空文字列、undefined、または文字列'undefined'の場合はデフォルト値を使用
    if (modelFromSettings && 
        typeof modelFromSettings === 'string' && 
        modelFromSettings.trim() !== '' && 
        modelFromSettings.trim().toLowerCase() !== 'undefined') {
        selectedModel = modelFromSettings.trim();
    }
    
    isInitialized = true;
    
    // デバッグログは設定が変更された場合のみ表示（silent=falseの場合）
    if (!silent) {
        console.log('Gemini Service initialization:', {
            modelFromSettings,
            selectedModel,
            aiFeaturesEnabled: aiSettings.get('AI_FEATURES_ENABLED'),
            allAiSettings: Array.from(aiSettings.entries())
        });
        
        if (aiSettings.get('AI_FEATURES_ENABLED') === 'true') {
            console.log(`Geminiサービスを初期化しました（プロキシ経由）。使用モデル: ${selectedModel}`);
        } else {
            console.log("Gemini Service is disabled by settings.");
        }
    }
};

// Helper to parse JSON, removing markdown wrappers if they exist
const parseJson = <T>(text: string): T => {
    const cleanJson = text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
    try {
        return JSON.parse(cleanJson) as T;
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", cleanJson);
        throw new Error("AIから無効なJSONレスポンスが返されました。");
    }
};

/**
 * AIサービスが初期化されていることを確認し、有効なモデル名を返す
 * @returns 有効なモデル名（デフォルト: 'gemini-2.5-flash'）
 */
const ensureAiInitialized = (): string => {
    // 初期化されていない場合、デフォルト値を使用
    if (!isInitialized) {
        console.warn('Gemini Serviceがまだ初期化されていません。デフォルトモデルを使用します。');
        return 'gemini-2.5-flash';
    }
    
    if (aiSettings.get('AI_FEATURES_ENABLED') !== 'true') {
        throw new Error("AI機能は現在無効になっています。「Google連携設定」ツールで有効にしてください。");
    }
    
    // selectedModelがundefined、null、空の文字列、または文字列'undefined'の場合、デフォルト値を設定して返す
    if (!selectedModel || 
        typeof selectedModel !== 'string' || 
        selectedModel.trim() === '' ||
        selectedModel.trim().toLowerCase() === 'undefined') {
        const defaultModel = 'gemini-2.5-flash';
        console.warn(`selectedModelが無効なため、デフォルト値（${defaultModel}）を使用します。現在の値:`, selectedModel);
        selectedModel = defaultModel;
        return defaultModel;
    }
    
    return selectedModel;
}

export type TriageResult = TriageResultType;

export interface InvoiceAnalysisResult {
    vendor_name: string;
    invoice_number: string;
    issue_date: string; // YYYY-MM-DD
    due_date: string; // YYYY-MM-DD
    total_amount: number;
}

export const getFixSuggestion = async (testName: string, errorMessage: string): Promise<{ diagnosis: string, suggestion: string }> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_SYSTEM_DIAGNOSTICS') !== 'true') {
        throw new Error("システム診断のAIアシスト機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('getFixSuggestion', {
            testName,
            errorMessage,
        }, modelToUse);
        return parseJson<{ diagnosis: string, suggestion: string }>(response.text);
    } catch (error) {
        console.error(`Error getting fix suggestion: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("AIによる修正案の取得に失敗しました。");
    }
};


export const triageEmail = async (email: Email): Promise<TriageResult> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_TRIAGE_EMAIL') !== 'true') {
        throw new Error("メール自動解析機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('triageEmail', {
            email: {
                from_address: email.from_address,
                subject: email.subject,
                body: email.body,
            },
        }, modelToUse);
        return parseJson<TriageResult>(response.text);
    } catch (error) {
        console.error(`Error triaging email: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("メールのAI解析に失敗しました。");
    }
};

export const generateReplyFromContext = async (
    originalEmail: Email,
    userInstruction: string,
    customerName: string
): Promise<{ subject: string; body: string }> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_GENERATE_REPLY') !== 'true') {
        throw new Error("返信文の自動生成機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
     try {
        const response = await callGeminiProxy('generateReplyFromContext', {
            originalEmail: {
                subject: originalEmail.subject,
                body: originalEmail.body,
            },
            userInstruction,
            customerName,
        }, modelToUse);
        return parseJson<{ subject: string; body: string }>(response.text);
    } catch (error) {
        console.error(`Error generating reply: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("AIによる返信文の生成に失敗しました。");
    }
};

export const generateEmailTemplate = async (
    prompt: string,
    signature: string,
    tone: string
): Promise<{ content: string }> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_GENERATE_TEMPLATE') !== 'true') {
        throw new Error("定型文の自動生成機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('generateEmailTemplate', {
            prompt,
            signature,
            tone,
        }, modelToUse);
        return { content: response.text };
    } catch (error) {
        console.error(`Error generating email template: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("AIによる定型文の生成に失敗しました。");
    }
};

export const generateDbOperation = async (schema: Column[], tableName: string, query: string): Promise<Operation> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_DB_OPERATION') !== 'true') {
        throw new Error("自然言語でのDB操作機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('generateDbOperation', {
            schema,
            tableName,
            query,
        }, modelToUse);

        const parsedOperation = parseJson<Operation>(response.text);
        if (!['INSERT', 'UPDATE', 'DELETE'].includes(parsedOperation.operation)) {
            throw new Error("Invalid operation returned from AI.");
        }
        return parsedOperation;
    } catch (error) {
        console.error(`Error generating DB operation: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("Could not generate a valid database operation from the request.");
    }
};

export const generateProductDescription = async (
    product: Row
): Promise<{ description: string; sources: any[] }> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_PRODUCT_DESCRIPTION') !== 'true') {
        throw new Error("商品説明文の自動生成機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('generateProductDescription', {
            product: {
                name: product.name,
                brand: product.brand_id, // プロキシではbrandとして扱う
                code: product.code,
            },
        }, modelToUse);
        
        const description = response.text;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { description, sources };
    } catch (error) {
        console.error(`Error generating product description: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("Failed to generate product description.");
    }
};

export const assignImagesToProducts = async (
    products: Row[],
    images: ImageFile[]
): Promise<Array<{ productId: string; imageName: string }>> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_ASSIGN_IMAGES') !== 'true') {
        throw new Error("商品画像の自動紐付け機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('assignImagesToProducts', {
            products: products.map(p => ({ id: p.id, name: p.name, code: p.code })),
            images: images.map(i => ({ name: i.name })),
        }, modelToUse);

        return parseJson<Array<{ productId: string; imageName: string }>>(response.text);
    } catch (error) {
        console.error(`Error assigning images: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("Could not assign images to products.");
    }
};

export const fetchColorData = async (
    colorCode: string,
    standard: 'pantone' | 'dic'
): Promise<Partial<Row>> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_FETCH_COLOR') !== 'true') {
        throw new Error("カラーライブラリの拡充機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    
    try {
        const response = await callGeminiProxy('fetchColorData', {
            colorCode,
            standard,
        }, modelToUse);
        return parseJson<Partial<Row>>(response.text);
    } catch (error) {
        console.error(`Error fetching ${standard} color data: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error(`${standard.toUpperCase()}のカラーデータの取得に失敗しました。モデル: ${modelToUse}`);
    }
};

interface DicChunkDetails { standard: 'dic'; part: '1' | '2'; start: number; end: number; }
interface PantoneChunkDetails { standard: 'pantone'; type: 'coated' | 'uncoated'; start: number; end: number; }

export const fetchColorChunk = async (
    details: DicChunkDetails | PantoneChunkDetails
): Promise<Row[]> => {
    const modelToUse = ensureAiInitialized();
     if (aiSettings.get('AI_ENABLED_FETCH_COLOR') !== 'true') {
        throw new Error("カラーライブラリの拡充機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    
    try {
        console.log(`カラーデータ取得を開始します。モデル: ${modelToUse}, 標準: ${details.standard}`);
        
        const response = await callGeminiProxy('fetchColorChunk', {
            details,
        }, modelToUse);
        return parseJson<Row[]>(response.text);
    } catch (error) {
        console.error(`Error fetching ${details.standard} color chunk: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error(`${details.standard.toUpperCase()}のカラーデータのチャンク取得に失敗しました。モデル: ${modelToUse}`);
    }
};

export const analyzeDocumentLayout = async (image: ImageFile): Promise<PdfTemplateBlock[]> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_ANALYZE_LAYOUT') !== 'true') {
        throw new Error("帳票レイアウト解析機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('analyzeDocumentLayout', {
            image: {
                type: image.type,
                base64Data: image.base64Data,
            },
        }, modelToUse);
        
        const parsedBlocks = parseJson<any[]>(response.text);
        return parsedBlocks.map((block: any, index: number) => ({
            ...block,
            id: `${block.type.toLowerCase()}_${Date.now()}_${index}`
        }));
    } catch (error) {
        console.error(`Error analyzing document layout: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("Could not analyze the document layout.");
    }
};

export const generateDocumentLayouts = async (prompt: string): Promise<PdfTemplateBlock[][]> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_GENERATE_LAYOUT') !== 'true') {
        throw new Error("帳票レイアウト生成機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
     try {
        const response = await callGeminiProxy('generateDocumentLayouts', {
            prompt,
        }, modelToUse);

        const layouts = parseJson<any[][]>(response.text);
        if (!Array.isArray(layouts) || layouts.length === 0) {
            throw new Error("AI returned an invalid format for layouts.");
        }
        return layouts.map((layout: any[]) =>
            layout.map((block: any, index: number) => ({
                ...block,
                id: `${block.type.toLowerCase()}_${Date.now()}_${Math.random()}_${index}`
            }))
        );
    } catch (error) {
        console.error(`Error generating document layouts: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("Could not generate document layouts from the prompt.");
    }
};

export const generateTranslations = async (
    japaneseTerms: Record<string, string>,
    targetLanguageName: string
): Promise<Record<string, string>> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_TRANSLATIONS') !== 'true') {
        throw new Error("UIテキストの自動翻訳機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('generateTranslations', {
            japaneseTerms,
            targetLanguageName,
        }, modelToUse);
        return parseJson<Record<string, string>>(response.text);
    } catch (error) {
        console.error(`Error generating ${targetLanguageName} translations: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error(`Could not generate ${targetLanguageName} translations from the request.`);
    }
};

export const analyzeInvoice = async (image: ImageFile): Promise<InvoiceAnalysisResult> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_ANALYZE_INVOICE') !== 'true') {
        throw new Error("請求書(支払)の自動解析機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('analyzeInvoice', {
            image: {
                type: image.type,
                base64Data: image.base64Data,
            },
        }, modelToUse);

        const parsedResult = parseJson<InvoiceAnalysisResult>(response.text);

        if (typeof parsedResult.total_amount !== 'number') {
            parsedResult.total_amount = parseFloat(String(parsedResult.total_amount).replace(/,/g, '')) || 0;
        }
        return parsedResult;
    } catch (error) {
        console.error(`Error analyzing invoice: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("請求書のAI解析に失敗しました。");
    }
};

export const updateIdFormatFromPrompt = async (
    prompt: string,
    currentFormats: IdFormat[]
): Promise<Partial<IdFormat>[]> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_UPDATE_ID_FORMAT') !== 'true') {
        throw new Error("IDフォーマットのAI設定機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('updateIdFormatFromPrompt', {
            prompt,
            currentFormats,
        }, modelToUse);
        return parseJson<Partial<IdFormat>[]>(response.text);
    } catch (error) {
        console.error(`Error updating ID format from prompt: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("AIによるIDフォーマットの解析に失敗しました。");
    }
};

export const generateDevelopmentTasks = async (
    inputText: string,
): Promise<{ feasibility?: string; summary: string; tasks_markdown: string; }> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_GENERATE_DEV_TASKS') !== 'true') {
        throw new Error("開発タスクの自動生成機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('generateDevelopmentTasks', {
            inputText,
        }, modelToUse);
        return parseJson<{ feasibility?: string; summary: string; tasks_markdown: string; }>(response.text);
    } catch (error) {
        console.error(`Error generating development tasks: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("Could not generate development tasks from the idea.");
    }
};

export const suggestModuleInfo = async (filePath: string): Promise<{ japaneseName: string; description: string; type: string; }> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_SUGGEST_MODULE_INFO') !== 'true') {
        throw new Error("モジュール情報の自動提案機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('suggestModuleInfo', {
            filePath,
        }, modelToUse);
        return parseJson<{ japaneseName: string; description: string; type: string; }>(response.text);
    } catch (error) {
        console.error(`Error suggesting module info: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("AIによるモジュール情報の提案に失敗しました。");
    }
};

export const suggestFileClassification = async (
    filePath: string,
    fileContent: string,
    toolList: { id: string; name: string }[]
): Promise<{ toolId: string }> => {
    const modelToUse = ensureAiInitialized();
    if (aiSettings.get('AI_ENABLED_CLASSIFY_FILE') !== 'true') {
        throw new Error("ファイル分類の自動提案機能は現在無効です。「Google連携設定」で有効にしてください。");
    }
    try {
        const response = await callGeminiProxy('suggestFileClassification', {
            filePath,
            fileContent,
            toolList,
        }, modelToUse);
        return parseJson<{ toolId: string }>(response.text);
    } catch (error) {
        console.error(`Error suggesting file classification for ${filePath}: ${String(error)}`);
        console.error(`使用モデル: ${modelToUse}`);
        throw new Error("AIによるファイル分類の提案に失敗しました。");
    }
};