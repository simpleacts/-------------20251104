import React, { useState } from 'react';
import { AppData, CostDetails, Database, EstimatorState, OrderDetail, Row } from '@shared/types';
import CustomerInfoSection from './organisms/CustomerInfoSection';
import EstimationResultPanel from './organisms/EstimationResultPanel';
import ProcessingGroupSection from './organisms/ProcessingGroupSection';
import QuoteIssuanceSection from './organisms/QuoteIssuanceSection';

interface EstimatorLayoutProps {
    appData: AppData;
    customers: Row[];
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
    estimatorState: EstimatorState;
    setEstimatorState: React.Dispatch<React.SetStateAction<EstimatorState>>;
    costDetails: CostDetails;
    updatedItems: OrderDetail[];
    onNavigateHome: () => void;
    onAddGroup: () => void;
    onRemoveGroup: (groupId: string) => void;
    onDuplicateGroup: (groupId: string) => void;
}

const EstimatorLayout: React.FC<EstimatorLayoutProps> = (props) => {
    const { estimatorState, setEstimatorState, costDetails, onAddGroup, onRemoveGroup, onDuplicateGroup } = props;
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-grow overflow-y-auto">
                <div className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <ProcessingGroupSection 
                            estimatorState={estimatorState} 
                            setEstimatorState={setEstimatorState} 
                            appData={props.appData} 
                            onAddGroup={onAddGroup}
                            onRemoveGroup={onRemoveGroup}
                            onDuplicateGroup={onDuplicateGroup}
                        />
                        <CustomerInfoSection
                            estimatorState={estimatorState}
                            setEstimatorState={setEstimatorState}
                            customers={props.customers}
                            appData={props.appData}
                        />
                        <QuoteIssuanceSection 
                            estimatorState={estimatorState}
                            setEstimatorState={setEstimatorState}
                            costDetails={costDetails}
                            onSaveAndIssue={() => { /* Logic will be in parent */ }}
                            database={props.database}
                            updatedItems={props.updatedItems}
                            appData={props.appData}
                            setDatabase={props.setDatabase}
                            selectedTemplateId={selectedTemplateId}
                            onTemplateIdChange={setSelectedTemplateId}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <EstimationResultPanel 
                                estimatorState={estimatorState}
                                costDetails={costDetails} 
                                printDesigns={estimatorState.processingGroups.flatMap(g => g.printDesigns)}
                                printLocations={props.appData.printLocations}
                                isBringInMode={estimatorState.isBringInMode}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EstimatorLayout;