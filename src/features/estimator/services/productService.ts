import { OrderDetail, Product, CustomerInfo, PricingData, BrandColor, Row } from '@shared/types';

const findRuleForProduct = (product: Product, customerInfo: CustomerInfo, pricingData: PricingData): Row | null => {
    const assignments = pricingData.pricingAssignments;
    const customerGroupId = customerInfo.customer_group_id || 'cgrp_00001'; 

    const findAssignment = (target_type: string, target_id: string | number) =>
        assignments.find(a =>
            a.target_type === target_type &&
            String(a.target_id) === String(target_id) &&
            (!a.customer_group_id || a.customer_group_id === 'all' || a.customer_group_id === customerGroupId)
        );

    const assignment =
        findAssignment('product', product.id) ||
        findAssignment('category', product.categoryId) ||
        findAssignment('manufacturer', product.manufacturerId);
    
    if (!assignment) return null;
    
    return pricingData.pricingRules.find(r => r.id === assignment.rule_id) || null;
};

const calculateUnitPrice = (
  product: Product,
  priceInfo: { listPrice: number; purchasePrice: number },
  rule: Row | null,
  totalProductQuantity: number,
  pricingData: PricingData
): number => {
    let rawPrice = 0;

    if (!rule) { 
        // ルールがない場合: 仕入れ値がある場合は仕入れ値×マークアップ、なければ定価×デフォルト率
        if (priceInfo.purchasePrice > 0) {
        rawPrice = priceInfo.purchasePrice * (1 + pricingData.defaultSellingMarkup);
        } else if (priceInfo.listPrice > 0) {
            // 仕入れ値がない場合は定価から計算（デフォルト率は0.52など）
            rawPrice = priceInfo.listPrice * 0.52; // デフォルトの定価掛率
        } else {
            rawPrice = 0;
        }
    } else {
        switch (rule.pricing_model) {
            case 'RATE':
                // 定価がある場合は定価×率で計算
                if (priceInfo.listPrice > 0) {
                    rawPrice = priceInfo.listPrice * (rule.rate as number);
                } else if (priceInfo.purchasePrice > 0) {
                    // 定価がない場合は仕入れ値×マークアップで計算（フォールバック）
                    rawPrice = priceInfo.purchasePrice * (1 + pricingData.defaultSellingMarkup);
                } else {
                    rawPrice = 0;
                }
                break;

            case 'MARKUP':
                // 仕入れ値×マークアップ率で計算（仕入れ値優先）
                if (priceInfo.purchasePrice > 0) {
                rawPrice = priceInfo.purchasePrice * (1 + (rule.markup_percentage as number));
                } else if (priceInfo.listPrice > 0) {
                    // 仕入れ値がない場合は定価×デフォルト率で計算（フォールバック）
                    rawPrice = priceInfo.listPrice * 0.52; // デフォルトの定価掛率
                } else {
                    rawPrice = 0;
                }
                break;

            case 'VOLUME_DISCOUNT_MARKUP':
                const schedule = pricingData.volumeDiscountSchedules.filter(s => s.schedule_id === rule.volume_discount_schedule_id);
                const tier = schedule.find(t => totalProductQuantity >= t.min_quantity && totalProductQuantity <= t.max_quantity);
                if (tier) {
                    // 仕入れ値×数量割引マークアップ倍率で計算
                    if (priceInfo.purchasePrice > 0) {
                    rawPrice = priceInfo.purchasePrice * (tier.markup_multiplier as number);
                    } else if (priceInfo.listPrice > 0) {
                        // 仕入れ値がない場合は定価×デフォルト率で計算（フォールバック）
                        rawPrice = priceInfo.listPrice * 0.52; // デフォルトの定価掛率
                    } else {
                        rawPrice = 0;
                    }
                } else {
                    // 数量割引のティアに該当しない場合
                    if (priceInfo.purchasePrice > 0) {
                    rawPrice = priceInfo.purchasePrice * (1 + pricingData.defaultSellingMarkup);
                    } else if (priceInfo.listPrice > 0) {
                        rawPrice = priceInfo.listPrice * 0.52; // デフォルトの定価掛率
                    } else {
                        rawPrice = 0;
                    }
                }
                break;

            default:
                // デフォルト: 仕入れ値がある場合は仕入れ値×マークアップ
                if (priceInfo.purchasePrice > 0) {
                rawPrice = priceInfo.purchasePrice * (1 + pricingData.defaultSellingMarkup);
                } else if (priceInfo.listPrice > 0) {
                    rawPrice = priceInfo.listPrice * 0.52; // デフォルトの定価掛率
                } else {
                    rawPrice = 0;
                }
        }
    }
    
    // Round up to the nearest 10 for all cases
    return Math.ceil(rawPrice / 10) * 10;
};


/**
 * Tシャツ本体のコストと、各アイテムの単価を計算する
 */
export const calculateTshirtAndUnitPrice = (
    items: OrderDetail[],
    allProducts: Product[],
    customerInfo: CustomerInfo,
    pricingData: PricingData,
    appColors: Record<string, Record<string, BrandColor>>,
    isBringInMode?: boolean
): { tshirtCost: number, updatedItems: OrderDetail[] } => {
    let tshirtCost = 0;
    const updatedItems: OrderDetail[] = [];
    const productMap = new Map<string, Product>(allProducts.map(p => [p.id, p]));

    const quantityPerProduct = items.reduce((acc, item) => {
        acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    items.forEach(item => {
        if (item.isBringIn) {
            updatedItems.push({ ...item, unitPrice: 0 });
            return;
        }

        const product = productMap.get(item.productId);
        if (!product) {
            updatedItems.push({ ...item, unitPrice: 0 });
            return;
        }

        const manufacturerColors = appColors[product.manufacturerId] || {};
        const colorInfo = Object.values(manufacturerColors).find(c => c.colorName === item.color);
        
        let priceInfo;
        // 価格ラベルは直接判定（'ホワイト'、'カラー'、'スペシャル'）
        if(product.prices.some(p => p.color === 'ホワイト' || p.color === 'カラー')){ // check if it uses new price group system
            const productPriceGroupItem = colorInfo?.type; // 'ホワイト' or 'カラー' or 'スペシャル'
            priceInfo = product.prices.find(p => p.color === productPriceGroupItem && p.size === item.size);
        } else { // fallback to old system
            priceInfo = product.prices.find(p => p.color === colorInfo?.type && p.size === item.size);
        }


        if (!priceInfo) {
            updatedItems.push({ ...item, unitPrice: 0 });
            return;
        }
        
        let unitPrice = 0;

        if (isBringInMode) {
            let rawPrice = 0;
            if (priceInfo.listPrice > 0) {
                rawPrice = priceInfo.listPrice * pricingData.bringInFeeRate;
            } else {
                rawPrice = priceInfo.purchasePrice * (1 + pricingData.defaultBringInMarkup);
            }
            unitPrice = Math.ceil(rawPrice / 10) * 10;
        } else {
            const rule = findRuleForProduct(product, customerInfo, pricingData);
            unitPrice = calculateUnitPrice(product, priceInfo, rule, quantityPerProduct[item.productId], pricingData);
        }
        
        tshirtCost += unitPrice * item.quantity;
        updatedItems.push({ ...item, unitPrice });
    });

    return { tshirtCost, updatedItems };
};