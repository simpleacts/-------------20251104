import React from 'react';
import { CostDetails, PrintDesign, PrintLocationData, EstimatorState } from '@shared/types';
import CostSummary from './CostSummary';

interface EstimationResultPanelProps {
    estimatorState: EstimatorState;
    costDetails: CostDetails;
    printDesigns: PrintDesign[];
    printLocations: PrintLocationData[];
    isBringInMode: boolean;
}

const EstimationResultPanel: React.FC<EstimationResultPanelProps> = (props) => {
    const { estimatorState, costDetails, printDesigns, printLocations, isBringInMode } = props;
    const quantity = costDetails.groupCosts?.reduce((sum, gc) => sum + gc.quantity, 0) || 0;
    
    return (
        <CostSummary 
            estimatorState={estimatorState}
            totalCost={costDetails.totalCost}
            shippingCost={costDetails.shippingCost}
            tax={costDetails.tax}
            totalCostWithTax={costDetails.totalCostWithTax}
            costPerShirt={costDetails.costPerShirt}
            quantity={quantity}
            tshirtCost={costDetails.tshirtCost}
            setupCost={costDetails.setupCost}
            printCost={costDetails.printCost}
            totalCustomItemsCost={costDetails.totalCustomItemsCost}
            totalProductDiscount={costDetails.totalProductDiscount}
            totalSampleItemsCost={costDetails.totalSampleItemsCost}
            printDesigns={printDesigns}
            costDetails={costDetails}
            printLocations={printLocations}
            isBringInMode={isBringInMode}
        />
    );
};

export default EstimationResultPanel;