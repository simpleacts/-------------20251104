import React, { useEffect, useMemo, useState } from 'react';
import { AppData, Database } from '@shared/types';
import { DtfPrinter, DtfPrintSettings, DtfPrintSpeed } from '../types';
import { CheckIcon, PencilIcon, XMarkIcon } from '@components/atoms';
import DtfInputs from '../organisms/DtfInputs';
import DtfResult from '../organisms/DtfResult';
import { calculateDtfCost, DtfCalculationResult } from '../services/dtfService';
// FIX: Import DtfCostSettings and DtfPriceSettings components.
import DtfCostSettings from '../organisms/DtfCostSettings';
import DtfPriceSettings from '../organisms/DtfPriceSettings';

const LogicSection: React.FC<{ title: React.ReactNode; description?: string; children?: React.ReactNode }> = ({ title, description, children }) => (
    <div className="mb-6 bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
        { typeof title === 'string' ? <h3 className="font-bold text-lg mb-2">{title}</h3> : title }
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
        {children}
    </div>
);

const SectionHeader: React.FC<{ title: string; sectionKey: string; editingSection: string | null; onEdit: () => void; onSave: () => void; onCancel: () => void; }> = ({ title, sectionKey, editingSection, onEdit, onSave, onCancel }) => {
    const isEditing = editingSection === sectionKey;
    return (
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">{title}</h3>
            {isEditing ? (
                <div className="flex gap-2">
                    <button onClick={onSave} className="px-3 py-1 text-sm bg-green-600 text-white rounded flex items-center gap-1"><CheckIcon className="w-4 h-4" /> 保存</button>
                    <button onClick={onCancel} className="px-3 py-1 text-sm bg-gray-500 text-white rounded flex items-center gap-1"><XMarkIcon className="w-4 h-4" /> キャンセル</button>
                </div>
            ) : (
                <button onClick={onEdit} className="p-2 text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5" /></button>
            )}
        </div>
    );
};

interface DtfLogicToolProps {
    appData: AppData;
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const DtfLogicTool: React.FC<DtfLogicToolProps> = ({ appData, database, setDatabase }) => {
    const [activeTab, setActiveTab] = useState<'simulator' | 'cost_settings' | 'price_settings'>('simulator');
    
    // Simulator state
    const [logoWidth, setLogoWidth] = useState<number | ''>(10);
    const [logoHeight, setLogoHeight] = useState<number | ''>(10);
    const [logoQuantity, setLogoQuantity] = useState(100);
    const [simProfitMargin, setSimProfitMargin] = useState(2.0);
    const [simSelectedPrinterId, setSimSelectedPrinterId] = useState<number | ''>('');
    const [simSelectedSpeedId, setSimSelectedSpeedId] = useState<number | ''>('');
    
    useEffect(() => {
        if (appData) {
            const defaultProfitMargin = appData.pricing.dtfProfitMargin || 2.0;
            
            setSimProfitMargin(defaultProfitMargin);
            
            const dbPrinters = (appData.dtfPrinters as DtfPrinter[]) || [];
            const defaultPrinter = dbPrinters.find(p => p.is_default) || dbPrinters[0];
            if (defaultPrinter) {
                setSimSelectedPrinterId(defaultPrinter.id);
                
                const speeds = ((appData.dtfPrintSpeeds as DtfPrintSpeed[]) || []).filter(s => s.printer_id === defaultPrinter.id);
                if (speeds.length > 0) {
                    const defaultSpeed = speeds.find(s => s.is_default) || speeds[0];
                    if(defaultSpeed) {
                        setSimSelectedSpeedId(defaultSpeed.id);
                    }
                }
            }
        }
    }, [appData]);

    const { consumables, equipment, laborCosts, electricityRates, printSettings, printers, printSpeeds } = useMemo(() => {
        if (!appData) return {} as any;
        return {
            consumables: appData.dtfConsumables, equipment: appData.dtfEquipment, laborCosts: appData.dtfLaborCosts,
            electricityRates: appData.dtfElectricityRates,
            printSettings: appData.dtfPrintSettings, printers: appData.dtfPrinters, printSpeeds: appData.dtfPrintSpeeds,
        };
    }, [appData]);

    const dtfData = useMemo(() => ({ consumables, equipment, laborCosts, pressTimeCosts: [], electricityRates }), [consumables, equipment, laborCosts, electricityRates]);
    
    const dynamicPrintSettings = useMemo((): DtfPrintSettings | null => {
        if (!printers || !printSpeeds || !printSettings) return null;
        const selectedPrinter = printers.find(p => p.id === simSelectedPrinterId);
        const selectedSpeed = printSpeeds.find(s => s.id === simSelectedSpeedId);
        if (!selectedPrinter || !selectedSpeed) return null;

        const printableWidthMeters = (selectedPrinter.printable_width_mm || selectedPrinter.film_width_mm) / 1000;
        const speedSqmPerHour = selectedSpeed.speed_sqm_per_hour_min;
        let linearSpeedMetersPerHour = speedSqmPerHour / printableWidthMeters;
        const inkDensity = selectedSpeed.ink_density;
        if (inkDensity && inkDensity > 1) {
            linearSpeedMetersPerHour /= inkDensity;
        }

        return { ...printSettings, filmWidthMm: selectedPrinter.printable_width_mm || selectedPrinter.film_width_mm, printSpeedMetersPerHour: linearSpeedMetersPerHour };
    }, [simSelectedPrinterId, simSelectedSpeedId, printers, printSpeeds, printSettings]);

    const calculationResult = useMemo((): DtfCalculationResult | null => {
        if (Number(logoWidth) <= 0 || Number(logoHeight) <= 0 || logoQuantity <= 0 || !dynamicPrintSettings || !dtfData) return null;
        
        const roundUp = appData?.pricing.dtfRoundUpTo10 ?? true;

        return calculateDtfCost(
            { logoWidthMm: Number(logoWidth) * 10, logoHeightMm: Number(logoHeight) * 10, logoQuantity: logoQuantity, profitMargin: simProfitMargin, roundUpTo10: roundUp },
            dtfData,
            dynamicPrintSettings
        );
    }, [logoWidth, logoHeight, logoQuantity, simProfitMargin, dtfData, dynamicPrintSettings, appData?.pricing.dtfRoundUpTo10]);

    const availableSpeeds = useMemo(() => printSpeeds?.filter(s => s.printer_id === simSelectedPrinterId) || [], [simSelectedPrinterId, printSpeeds]);
    
    const selectedSpeedInfo = printSpeeds.find(s => s.id === simSelectedSpeedId);
    
    const getTabButtonClass = (tabName: string) => `py-3 px-4 border-b-2 font-medium text-sm ${activeTab === tabName ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">DTF計算ロジック管理</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">DTFプリントの原価・価格設定を管理・シミュレーションします。</p>
            </header>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('simulator')} className={getTabButtonClass('simulator')}>シミュレーター</button>
                    <button onClick={() => setActiveTab('cost_settings')} className={getTabButtonClass('cost_settings')}>原価設定</button>
                    <button onClick={() => setActiveTab('price_settings')} className={getTabButtonClass('price_settings')}>価格・デフォルト設定</button>
                </nav>
            </div>
            <div className="flex-grow overflow-auto">
                {activeTab === 'simulator' && (
                    <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <DtfInputs 
                            logoWidth={logoWidth} setLogoWidth={setLogoWidth} 
                            logoHeight={logoHeight} setLogoHeight={setLogoHeight} 
                            logoQuantity={logoQuantity} setLogoQuantity={setLogoQuantity} 
                            profitMargin={simProfitMargin} setProfitMargin={setSimProfitMargin} 
                            printers={printers as DtfPrinter[]} 
                            selectedPrinterId={simSelectedPrinterId} 
                            handlePrinterChange={(e) => {
                                const newId = Number(e.target.value);
                                setSimSelectedPrinterId(newId);
                                const newSpeeds = (printSpeeds || []).filter((s: DtfPrintSpeed) => s.printer_id === newId);
                                const defaultSpeed = newSpeeds.find(s => s.is_default) || newSpeeds[0];
                                setSimSelectedSpeedId(defaultSpeed ? defaultSpeed.id : '');
                            }}
                            availableSpeeds={availableSpeeds} 
                            selectedSpeedId={simSelectedSpeedId} 
                            setSelectedSpeedId={setSimSelectedSpeedId} 
                            selectedSpeedInfo={selectedSpeedInfo} 
                        />
                        <DtfResult calculationResult={calculationResult} />
                    </div>
                )}
                {activeTab === 'cost_settings' && <DtfCostSettings appData={appData} database={database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />}
                {activeTab === 'price_settings' && <DtfPriceSettings appData={appData} database={database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />}
            </div>
        </div>
    );
};

// FIX: Corrected component export name from DtfCostCalculatorTool to DtfLogicTool.
export default DtfLogicTool;