import { Database, EstimatorState, OrderDetail, PrintDesign, Row } from '@shared/types';
import { EnrichedQuote } from '@features/order-management/types';
import { getAllManufacturerTableData, getProductDetailsFromStock } from '@core/utils';

export const loadQuoteFromDatabase = (quote: EnrichedQuote, database: Database): EstimatorState | null => {
    try {
        if (!quote.id || !database) {
            return null;
        }

        const quoteId = quote.id as string;

        // 顧客情報を取得
        const customer = database.customers?.data.find(c => c.id === quote.customer_id);
        if (!customer) {
            console.error('Customer not found for quote:', quoteId);
            return null;
        }

        // quote_itemsを取得してグループ化
        const quoteItems = (database.quote_items?.data || []).filter(
            (item: Row) => item.quote_id === quoteId
        ) as Row[];

        // quote_designsを取得
        const quoteDesigns = (database.quote_designs?.data || []).filter(
            (design: Row) => design.quote_id === quoteId
        ) as Row[];

        // グループごとにアイテムを整理
        const groupsMap = new Map<string, { items: OrderDetail[], designs: PrintDesign[] }>();
        
        quoteItems.forEach((item: Row) => {
            const groupName = (item.group_name as string) || '加工グループ1';
            const groupIndex = (item.group_index as number) || 0;
            const groupKey = `${groupIndex}_${groupName}`;

            if (!groupsMap.has(groupKey)) {
                groupsMap.set(groupKey, { items: [], designs: [] });
            }

            // 製品名を取得（メーカー依存テーブルから）
            const productId = item.product_id as string;
            // stockテーブルから商品詳細を取得（product_detailsの代替）
            const allProductDetails = getProductDetailsFromStock(database);
            const productDetail = allProductDetails.find(
                (pd: Row) => pd.product_id === productId
            );
            const productName = (productDetail?.productName as string) || productId;

            const orderDetail: OrderDetail = {
                productId: productId,
                productName: productName,
                color: item.color as string,
                size: item.size as string,
                quantity: (item.quantity as number) || 0,
                unitPrice: (item.unit_price as number) || 0,
                isBringIn: !!(item.is_bring_in as number),
            };

            groupsMap.get(groupKey)!.items.push(orderDetail);
        });

        // デザインをグループごとに整理
        quoteDesigns.forEach((design: Row) => {
            const groupIndex = (design.group_index as number) || 0;
            const groupName = (design.group_name as string) || '加工グループ1';
            const groupKey = `${groupIndex}_${groupName}`;

            if (!groupsMap.has(groupKey)) {
                groupsMap.set(groupKey, { items: [], designs: [] });
            }

            const printDesign: PrintDesign = {
                id: design.id as string || `design_${Date.now()}_${Math.random()}`,
                location: design.location as string,
                printMethod: design.print_method as 'dtf' | 'silkscreen',
                imageSrc: design.image_src as string || '',
                originalImageSrc: design.original_image_src as string || '',
                imageName: design.image_name as string || '',
                ...(design.print_method === 'dtf' && {
                    widthCm: design.width_cm as number,
                    heightCm: design.height_cm as number,
                }),
                ...(design.print_method === 'silkscreen' && {
                    size: design.size as '10x10' | '30x40' | '35x50',
                    colors: design.colors as number,
                    specialInks: design.special_inks ? JSON.parse(design.special_inks as string) : [],
                    plateType: (design.plate_type as 'normal' | 'decomposition') || 'normal',
                }),
            };

            groupsMap.get(groupKey)!.designs.push(printDesign);
        });

        // グループを配列に変換（groupIndex順にソート）
        const processingGroups = Array.from(groupsMap.entries())
            .sort(([keyA], [keyB]) => {
                const indexA = parseInt(keyA.split('_')[0]) || 0;
                const indexB = parseInt(keyB.split('_')[0]) || 0;
                return indexA - indexB;
            })
            .map(([groupKey, data]) => {
                const groupName = groupKey.split('_').slice(1).join('_') || '加工グループ1';
                return {
                    id: `group_${Date.now()}_${groupKey}`,
                    name: groupName,
                    items: data.items,
                    printDesigns: data.designs,
                    selectedOptions: [],
                };
            });

        // グループが空の場合はデフォルトグループを作成
        if (processingGroups.length === 0) {
            processingGroups.push({
                id: `group_${Date.now()}`,
                name: '加工グループ1',
                items: [],
                printDesigns: [],
                selectedOptions: [],
            });
        }

        // EstimatorStateを構築
        const estimatorState: EstimatorState = {
            processingGroups,
            customerInfo: {
                id: customer.id as string,
                company_name: customer.company_name as string || '',
                name_kanji: customer.name_kanji as string || '',
                name_kana: customer.name_kana as string || '',
                email: customer.email as string || '',
                phone: customer.phone as string || '',
                zip_code: customer.zip_code as string || '',
                address1: customer.address1 as string || '',
                address2: customer.address2 as string || '',
                notes: customer.notes as string || '',
                customer_group_id: customer.customer_group_id as string || 'cgrp_00001',
                has_separate_shipping_address: !!(customer.has_separate_shipping_address as number),
                shipping_name: customer.shipping_name as string || '',
                shipping_phone: customer.shipping_phone as string || '',
                shipping_zip_code: customer.shipping_zip_code as string || '',
                shipping_address1: customer.shipping_address1 as string || '',
                shipping_address2: customer.shipping_address2 as string || '',
                created_at: customer.created_at,
                updated_at: customer.updated_at,
            },
            senderInfo: null, // 後で設定される
            isDataConfirmed: false,
            isOrderPlaced: false,
            orderDate: null,
            estimateId: quoteId,
            isBringInMode: false,
            isReorder: false,
            originalEstimateId: quoteId,
        };

        return estimatorState;
    } catch (error) {
        console.error('Failed to load quote from database:', error);
        return null;
    }
};

