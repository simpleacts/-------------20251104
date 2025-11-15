

import { EstimationParams, CostDetails, Product, PrintLocation, CustomerInfo, PricingData, OrderDetail, BrandColor } from '../types';

const getRegionFromPrefecture = (address1: string, pricingData: PricingData): string => {
  if (!address1) {
    return 'DEFAULT';
  }
  const region = Object.keys(pricingData.shippingCosts).find(r => 
    pricingData.shippingCosts[r].prefectures.some(p => address1.startsWith(p))
  );
  
  return region || 'DEFAULT';
};

export const calculateCost = (
  params: EstimationParams, 
  allProducts: Product[], 
  customerInfo: CustomerInfo, 
  pricingData: PricingData,
  appColors: Record<string, Record<string, BrandColor>>,
  options?: { isAdminMode?: boolean; isPartnerMode?: boolean; overridePrintQuantity?: number; isReorder?: boolean; isBringInMode?: boolean }
): CostDetails => {
  const { items, printDesigns } = params;
  
  const productCategoryMap = new Map<string, string>();
  allProducts.forEach(p => productCategoryMap.set(p.id, p.categoryId));
  const productMap = new Map<string, Product>(allProducts.map(p => [p.id, p]));

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const zeroCost: CostDetails = {
    totalCost: 0, shippingCost: 0, tax: 0, totalCostWithTax: 0, costPerShirt: 0, 
    tshirtCost: 0, setupCost: 0, printCost: 0,
    printCostDetail: { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 },
    setupCostDetail: {},
  };

  if (totalQuantity <= 0 && (!options?.overridePrintQuantity || options.overridePrintQuantity <= 0)) {
    return zeroCost;
  }
  
  const isPrivilegedMode = options?.isAdminMode || options?.isPartnerMode;

  // 1. Base shirt cost
  let tshirtCost = 0;
  if (options?.isBringInMode) {
      tshirtCost = items.reduce((sum, item) => {
          const product = productMap.get(item.productId);
          if (!product) return sum;

          const brandColors = appColors[product.brand] || {};
          const colorInfo = Object.values(brandColors).find(c => c.name === item.color);
          if (!colorInfo) return sum;
          
          const priceInfo = product.prices.find(p => p.color === colorInfo.type && p.size === item.size);
          if (!priceInfo || !priceInfo.listPrice) return sum;

          const listPrice = priceInfo.listPrice;
          const bringInFeeRate = pricingData.bringInFeeRate || 0.05;
          const bringInFeeRaw = listPrice * bringInFeeRate;
          const bringInFee = Math.ceil(bringInFeeRaw / 10) * 10;
          
          return sum + (bringInFee * item.quantity);
      }, 0);
  } else {
      tshirtCost = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }


  // 2. Setup cost (plate cost) based on print designs and plate combination rules
  const setupCostDetail: Record<string, number> = {};
  let totalSetupCost = 0;
  
  if (!options?.isReorder) {
    const plateGroupIdsInOrder = new Set<string>();
    items.forEach(item => {
      const categoryId = productCategoryMap.get(item.productId);
      if (categoryId) {
          const groupId = pricingData.plateCostCategoryCombinations[categoryId] || categoryId;
          plateGroupIdsInOrder.add(groupId);
      }
    });

    const numPlateGroups = isPrivilegedMode ? 1 : Math.max(1, plateGroupIdsInOrder.size);

    printDesigns.forEach(design => {
      if (design.location && design.colors > 0) {
        const plateCostKey = `${design.size}-${design.plateType || 'normal'}`;
        const plateInfo = pricingData.plateCosts[plateCostKey];
        const costForDesign = (plateInfo?.cost || 0) * design.colors * numPlateGroups;
        totalSetupCost += costForDesign;
        setupCostDetail[design.id] = costForDesign;
      }
    });
  }
  
  // 3. Print cost
  const totalPrintCostDetail = { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 };

  if (isPrivilegedMode) {
      const printQuantity = (options.overridePrintQuantity && options.overridePrintQuantity > 0)
          ? options.overridePrintQuantity
          : totalQuantity;

      if (printQuantity > 0) {
          const tier = pricingData.printPricingTiers.find(t => printQuantity >= t.min && printQuantity <= t.max);
          if (tier) {
              let itemSurchargeTotal = 0;
              items.forEach(item => {
                  const product = allProducts.find(p => p.id === item.productId);
                  if (product) {
                      let surchargeForItem = 0;
                      product.tags.forEach(tag => {
                          if (pricingData.additionalPrintCostsByTag[tag]) {
                              surchargeForItem += pricingData.additionalPrintCostsByTag[tag];
                          }
                      });
                      itemSurchargeTotal += surchargeForItem * item.quantity;
                  }
              });
              totalPrintCostDetail.byItem = itemSurchargeTotal;

              printDesigns.forEach(design => {
                  if (design.location && design.colors > 0) {
                      totalPrintCostDetail.base += (tier.firstColor + Math.max(0, design.colors - 1) * tier.additionalColor) * printQuantity;
                      totalPrintCostDetail.bySize += (pricingData.additionalPrintCostsBySize[design.size] ?? 0) * printQuantity;
                      design.specialInks.forEach(ink => {
                          totalPrintCostDetail.byInk += (pricingData.specialInkCosts[ink.type] || 0) * ink.count * printQuantity;
                      });
                      totalPrintCostDetail.byLocation += (pricingData.additionalPrintCostsByLocation[design.location as PrintLocation] ?? 0) * printQuantity;
                      const plateCostKey = `${design.size}-${design.plateType || 'normal'}`;
                      const plateInfo = pricingData.plateCosts[plateCostKey];
                      totalPrintCostDetail.byPlateType += (plateInfo?.surchargePerColor || 0) * design.colors * printQuantity;
                  }
              });
          }
      }
  } else {
      const itemsByPrintGroup: Record<string, OrderDetail[]> = {};
      items.forEach(item => {
        const categoryId = productCategoryMap.get(item.productId);
        if (categoryId) {
            const groupId = pricingData.printCostCategoryCombinations[categoryId] || categoryId;
            if (!itemsByPrintGroup[groupId]) {
                itemsByPrintGroup[groupId] = [];
            }
            itemsByPrintGroup[groupId].push(item);
        }
      });
      for (const groupId in itemsByPrintGroup) {
          const groupItems = itemsByPrintGroup[groupId];
          const groupQuantity = groupItems.reduce((sum, item) => sum + item.quantity, 0);

          if (groupQuantity <= 0) continue;

          const tier = pricingData.printPricingTiers.find(t => groupQuantity >= t.min && groupQuantity <= t.max);
          if (!tier) continue;
          
          let groupItemSurcharge = 0;
          groupItems.forEach(item => {
              const product = allProducts.find(p => p.id === item.productId);
              if (product) {
                  let surchargeForItem = 0;
                  product.tags.forEach(tag => {
                      if (pricingData.additionalPrintCostsByTag[tag]) {
                          surchargeForItem += pricingData.additionalPrintCostsByTag[tag];
                      }
                  });
                  groupItemSurcharge += surchargeForItem * item.quantity;
              }
          });
          totalPrintCostDetail.byItem += groupItemSurcharge;

          printDesigns.forEach(design => {
            if (design.location && design.colors > 0) {
              totalPrintCostDetail.base += (tier.firstColor + Math.max(0, design.colors - 1) * tier.additionalColor) * groupQuantity;
              totalPrintCostDetail.bySize += (pricingData.additionalPrintCostsBySize[design.size] ?? 0) * groupQuantity;
              design.specialInks.forEach(ink => {
                  totalPrintCostDetail.byInk += (pricingData.specialInkCosts[ink.type] || 0) * ink.count * groupQuantity;
              });
              totalPrintCostDetail.byLocation += (pricingData.additionalPrintCostsByLocation[design.location as PrintLocation] ?? 0) * groupQuantity;
              const plateCostKey = `${design.size}-${design.plateType || 'normal'}`;
              const plateInfo = pricingData.plateCosts[plateCostKey];
              totalPrintCostDetail.byPlateType += (plateInfo?.surchargePerColor || 0) * design.colors * groupQuantity;
            }
          });
      }
  }

  const totalPrintCost = Object.values(totalPrintCostDetail).reduce((a, b) => a + b, 0);

  // 4. Subtotal
  const subtotal = tshirtCost + totalSetupCost + totalPrintCost;

  // 5. Shipping cost
  let shippingCost = 0;
  if (subtotal > 0 && subtotal < pricingData.shippingFreeThreshold) {
      const shippingAddress1 = (customerInfo.hasSeparateShippingAddress && customerInfo.shippingAddress1) ? customerInfo.shippingAddress1 : customerInfo.address1;
      const region = getRegionFromPrefecture(shippingAddress1, pricingData);
      shippingCost = pricingData.shippingCosts[region]?.cost || pricingData.shippingCosts['DEFAULT']?.cost || 0;
  }

  // 6. Tax calculation (shipping is also taxed)
  const taxableTotal = subtotal + shippingCost;
  const tax = taxableTotal * 0.10;
  const totalCostWithTax = taxableTotal + tax;

  // 7. Final calculation
  const costPerShirtQuantity = options?.overridePrintQuantity && options.overridePrintQuantity > 0 ? options.overridePrintQuantity : totalQuantity;
  const costPerShirtWithTax = costPerShirtQuantity > 0 ? totalCostWithTax / costPerShirtQuantity : 0;

  return {
    totalCost: Math.round(subtotal),
    shippingCost: Math.round(shippingCost),
    tax: Math.round(tax),
    totalCostWithTax: Math.round(totalCostWithTax),
    costPerShirt: Math.round(costPerShirtWithTax),
    tshirtCost: Math.round(tshirtCost),
    setupCost: Math.round(totalSetupCost),
    printCost: Math.round(totalPrintCost),
    printCostDetail: {
      base: Math.round(totalPrintCostDetail.base),
      byItem: Math.round(totalPrintCostDetail.byItem),
      bySize: Math.round(totalPrintCostDetail.bySize),
      byInk: Math.round(totalPrintCostDetail.byInk),
      byLocation: Math.round(totalPrintCostDetail.byLocation),
      byPlateType: Math.round(totalPrintCostDetail.byPlateType),
    },
    setupCostDetail,
  };
};
