import React from 'react';
import { Page } from '@core/config/Routes';
import { updateDatabase } from '@core/utils';
import { CostDetails, Database, EstimatorState, OrderDetail, Row } from '@shared/types';

export interface SaveQuoteParams {
    estimatorState: EstimatorState;
    costDetails: CostDetails;
    updatedItems: OrderDetail[];
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
    documentType?: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt';
    templateId?: string | null;
    toolName?: Page; // Optional: tool name for access control
    documentSettings?: any; // 帳票設定（JSON形式で保存）
}

export const saveQuoteToDatabase = async ({
    estimatorState,
    costDetails,
    updatedItems,
    database,
    setDatabase,
    documentType = 'estimate',
    templateId = null,
    toolName = 'estimator', // Default tool name
    documentSettings = null, // 帳票設定
}: SaveQuoteParams): Promise<{ success: boolean; quoteId?: string; error?: string }> => {
    try {
        // 見積書IDを生成または既存のIDを使用
        const quoteId = estimatorState.estimateId;

        // 顧客情報が設定されていない場合はエラー
        if (!estimatorState.customerInfo.id) {
            return { success: false, error: '顧客情報が設定されていません。' };
        }

        // 既存の見積を確認（編集モードかどうか）
        const existingQuote = database.quotes?.data.find((q: Row) => q.id === quoteId);
        const isEditMode = !!existingQuote;
        const createdAt = isEditMode ? existingQuote.created_at : new Date().toISOString();

        // テンプレートIDの処理：
        // - 新規作成時：指定されたtemplateIdを設定（作成時に使用したテンプレートIDを保存）
        // - 編集時：既存のlast_used_template_idを保持（作成時のテンプレートIDを維持）
        //   各帳票ごとに作成時に使用したテンプレートIDを個別に保存するため、編集時は原則として更新しない
        const existingTemplateId = existingQuote?.last_used_template_id as string | null | undefined;
        const finalTemplateId = isEditMode 
            ? (existingTemplateId || templateId) // 編集時：既存のテンプレートIDを優先（作成時のテンプレートIDを保持）
            : templateId; // 新規作成時：指定されたテンプレートIDを使用

        // quotesテーブルに保存
        const quoteData: Row = {
            id: quoteId,
            customer_id: estimatorState.customerInfo.id as string,
            quote_status: '見積',
            total_cost_ex_tax: costDetails.totalCost || 0,
            shipping_cost: costDetails.shippingCost || 0,
            tax: costDetails.tax || 0,
            total_cost_in_tax: costDetails.totalCostWithTax || 0,
            created_at: createdAt,
            updated_at: new Date().toISOString(),
            document_type: documentType,
            last_used_template_id: finalTemplateId, // 作成時に使用したテンプレートID（各帳票ごとに個別保存）
            payment_due_date: null,
            internal_notes: estimatorState.customerInfo.notes as string || null,
            document_settings_json: documentSettings ? JSON.stringify(documentSettings) : null, // 帳票設定をJSON形式で保存
        };

        // quote_itemsテーブルに保存
        const quoteItems: Row[] = [];
        estimatorState.processingGroups.forEach((group, groupIndex) => {
            group.items.forEach((item, itemIndex) => {
                quoteItems.push({
                    id: `qi_${quoteId}_${groupIndex}_${itemIndex}`,
                    quote_id: quoteId,
                    product_id: item.productId,
                    color: item.color,
                    size: item.size,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    is_bring_in: item.isBringIn ? 1 : 0,
                    group_name: group.name,
                    group_index: groupIndex,
                    item_index: itemIndex,
                } as Row);
            });
        });

        // quote_designsテーブルに保存
        const quoteDesigns: Row[] = [];
        estimatorState.processingGroups.forEach((group, groupIndex) => {
            group.printDesigns.forEach((design, designIndex) => {
                quoteDesigns.push({
                    id: `qd_${quoteId}_${groupIndex}_${designIndex}`,
                    quote_id: quoteId,
                    group_index: groupIndex,
                    group_name: group.name,
                    location: design.location,
                    print_method: design.printMethod,
                    image_src: design.imageSrc || null,
                    original_image_src: design.originalImageSrc || null,
                    image_name: design.imageName || null,
                    width_cm: design.printMethod === 'dtf' ? (design as any).widthCm : null,
                    height_cm: design.printMethod === 'dtf' ? (design as any).heightCm : null,
                    size: design.printMethod === 'silkscreen' ? (design as any).size : null,
                    colors: design.printMethod === 'silkscreen' ? (design as any).colors : null,
                    special_inks: design.printMethod === 'silkscreen' ? JSON.stringify((design as any).specialInks || []) : null,
                    plate_type: design.printMethod === 'silkscreen' ? (design as any).plateType || 'normal' : null,
                } as Row);
            });
        });

        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));

            // quotesテーブルに追加（既に存在する場合は更新）
            if (!newDb.quotes) {
                newDb.quotes = { data: [] };
            }
            const existingQuoteIndex = newDb.quotes.data.findIndex((q: Row) => q.id === quoteId);
            if (existingQuoteIndex >= 0) {
                newDb.quotes.data[existingQuoteIndex] = { ...newDb.quotes.data[existingQuoteIndex], ...quoteData };
            } else {
                newDb.quotes.data.push(quoteData);
            }

            // quote_itemsテーブルに追加（既存のアイテムを削除してから追加）
            if (!newDb.quote_items) {
                newDb.quote_items = { data: [] };
            }
            newDb.quote_items.data = newDb.quote_items.data.filter((item: Row) => item.quote_id !== quoteId);
            newDb.quote_items.data.push(...quoteItems);

            // quote_designsテーブルに追加（既存のデザインを削除してから追加）
            if (!newDb.quote_designs) {
                newDb.quote_designs = { data: [] };
            }
            newDb.quote_designs.data = newDb.quote_designs.data.filter((design: Row) => design.quote_id !== quoteId);
            newDb.quote_designs.data.push(...quoteDesigns);

            return newDb;
        });

        // サーバーに保存するための操作を準備
        try {
            // quotesテーブルの更新（INSERTまたはUPDATE）
            const quotesOperations: any[] = [];
            if (isEditMode) {
                quotesOperations.push({
                    type: 'UPDATE' as const,
                    data: quoteData,
                    where: { id: quoteId }
                });
            } else {
                quotesOperations.push({
                    type: 'INSERT' as const,
                    data: quoteData
                });
            }

            const quotesResult = await updateDatabase(toolName, 'quotes', quotesOperations, database);
            if (!quotesResult.success) {
                throw new Error(quotesResult.error || 'Failed to save quote to server');
            }

            // quote_itemsテーブル: 既存のアイテムを削除してから新しいアイテムを追加
            const itemsOperations: any[] = [
                {
                    type: 'DELETE' as const,
                    where: { quote_id: quoteId }
                },
                ...quoteItems.map(item => ({
                    type: 'INSERT' as const,
                    data: item
                }))
            ];

            const itemsResult = await updateDatabase(toolName, 'quote_items', itemsOperations, database);
            if (!itemsResult.success) {
                throw new Error(itemsResult.error || 'Failed to save quote items to server');
            }

            // quote_designsテーブル: 既存のデザインを削除してから新しいデザインを追加
            const designsOperations: any[] = [
                {
                    type: 'DELETE' as const,
                    where: { quote_id: quoteId }
                },
                ...quoteDesigns.map(design => ({
                    type: 'INSERT' as const,
                    data: design
                }))
            ];

            const designsResult = await updateDatabase(toolName, 'quote_designs', designsOperations, database);
            if (!designsResult.success) {
                throw new Error(designsResult.error || 'Failed to save quote designs to server');
            }

            console.log('[saveQuote] Successfully saved quote to server');
        } catch (error) {
            console.error('[saveQuote] Failed to save to server:', error);
            // サーバーへの保存が失敗してもローカル状態は更新されているので、警告を出す
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'サーバーへの保存に失敗しました。ローカルのみ更新されています。' 
            };
        }

        return { success: true, quoteId };
    } catch (error) {
        console.error('Failed to save quote:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : '見積書の保存に失敗しました。' 
        };
    }
};

