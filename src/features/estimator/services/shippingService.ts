import { CustomerInfo, PricingData } from '@shared/types';

const getRegionFromPrefecture = (address1: string, pricingData: PricingData): string => {
  if (!address1) {
    return 'DEFAULT';
  }
  const region = Object.keys(pricingData.shippingCosts).find(r =>
    pricingData.shippingCosts[r].prefectures.some(p => address1.startsWith(p))
  );

  return region || 'DEFAULT';
};

/**
 * 送料を計算する
 */
export const calculateShippingCost = (
    subtotal: number,
    customerInfo: CustomerInfo,
    pricingData: PricingData
): number => {
    if (subtotal >= pricingData.shippingFreeThreshold) {
        return 0;
    }
    const region = getRegionFromPrefecture(customerInfo.address1, pricingData);
    return pricingData.shippingCosts[region]?.cost || pricingData.shippingCosts['DEFAULT']?.cost || 0;
};