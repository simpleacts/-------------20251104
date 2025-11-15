import { ProcessingGroup, AppData, AdditionalOption } from '@shared/types';

/**
 * 追加オプションのコストを計算する
 */
export const calculateAdditionalOptionsCost = (
    group: ProcessingGroup,
    appData: AppData
): { totalOptionsCost: number; optionsCostDetail: Record<string, number> } => {
    let totalOptionsCost = 0;
    const optionsCostDetail: Record<string, number> = {};
    if (!group.selectedOptions || group.selectedOptions.length === 0 || !appData.additionalOptions) {
        return { totalOptionsCost, optionsCostDetail };
    }

    const totalItems = group.items.reduce((sum, item) => sum + item.quantity, 0);
    const optionsMap = new Map((appData.additionalOptions as AdditionalOption[]).map(opt => [opt.id, opt]));

    group.selectedOptions.forEach(selectedOpt => {
        const optionData = optionsMap.get(selectedOpt.optionId);
        if (optionData) {
            const costForItem = (optionData.cost_per_item || 0) * totalItems;
            totalOptionsCost += costForItem;
            optionsCostDetail[optionData.name as string] = costForItem;
        }
    });

    return { totalOptionsCost, optionsCostDetail };
};