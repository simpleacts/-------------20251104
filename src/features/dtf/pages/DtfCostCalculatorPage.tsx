import React, { useState, useMemo, useEffect } from 'react';
import { Database, Row, AppData } from '@shared/types';
import { DtfConsumable, DtfEquipment, DtfLaborCost, DtfElectricityRate, DtfPrintSettings, DtfPrinter, DtfPrintSpeed } from '../types';
import { calculateDtfCost, DtfCalculationResult } from '../services/dtfService';
import { PencilIcon, CheckIcon, XMarkIcon, SpinnerIcon } from '@components/atoms';
import EditableField from '@components/molecules/EditableField';
import DtfInputs from '../organisms/DtfInputs';
import DtfResult from '../organisms/DtfResult';
import { PageHeader } from '@components/molecules';
import DtfCostSettings from '../organisms/DtfCostSettings';
import DtfPriceSettings from '../organisms/DtfPriceSettings';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { getRequiredTablesForPage } from '@core/config/Routes';
import { fetchTables } from '@core/data/db.live';
import transformDatabaseToAppData from '@shared/utils/estimatorDataTransformer';

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

interface DtfCostCalculatorToolProps {
    appData: AppData;
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const DtfCostCalculatorTool: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appData, setAppData] = useState<AppData | null>(null);
    const [activeTab, setActiveTab] = useState<'simulator' | 'cost_settings' | 'price_settings'>('simulator');
    
    // Simulator state
    const [logoWidth, setLogoWidth] = useState<number | ''>(10);
    const [logoHeight, setLogoHeight] = useState<number | ''>(10);
    const [logoQuantity, setLogoQuantity] = useState(100);
    const [simProfitMargin, setSimProfitMargin] = useState(2.0);
    const [simSelectedPrinterId, setSimSelectedPrinterId] = useState<number | ''>('');
    const [simSelectedSpeedId, setSimSelectedSpeedId] = useState<number | ''>('');

    useEffect(() => {
        const requiredTables = getRequiredTablesForPage('dtf-cost-calculator', undefined, database);
        
        const loadNeededData = async () => {
            if (!database) { setIsLoading(true); return; };
            const missingTables = requiredTables.filter(t => !database[t]);
            if (missingTables.length > 0) {
                setIsLoading(true);
                try {
                    const newData = await fetchTables(missingTables, { toolName: 'dtf-cost-calculator' });
                    setDatabase(prev => ({ ...prev, ...newData }));
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };
        loadNeededData();
    }, [database, setDatabase]);
    
    useEffect(() => {
        if (!isLoading && database) {
            const requiredTables = getRequiredTablesForPage('dtf-cost-calculator', undefined, database);
            if (requiredTables.every(t => database[t])) {
                const transformedData = transformDatabaseToAppData(database as Database);
                setAppData(transformedData);
            } else {
                // This might indicate that not all required tables were fetched, which could be a configuration issue.
                // For now, we'll let it be handled by the loading/error state.
            }
        }
    }, [database, isLoading]);

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
                    if(defaultSpeed) setSimSelectedSpeedId(defaultSpeed.id);
                }
            }
        }
    }, [appData]);
    
    const { dtfData, printers, printSpeeds, printSettings } = useMemo(() => {
        if (!appData) return { dtfData: null, printers: [], printSpeeds: [], printSettings: null };
        return {
            dtfData: {
                consumables: appData.dtfConsumables,
                equipment: appData.dtfEquipment,
                laborCosts: appData.dtfLaborCosts,
                pressTimeCosts: appData.dtfPressTimeCosts,
                electricityRates: appData.dtfElectricityRates,
            },
            printers: appData.dtfPrinters,
            printSpeeds: appData.dtfPrintSpeeds,
            printSettings: appData.dtfPrintSettings
        };
    }, [appData]);

    const dynamicPrintSettings = useMemo((): DtfPrintSettings | null => {
        if (!printers || !printSpeeds || !printSettings) return null;
        const selectedPrinter = printers.find((p: DtfPrinter) => p.id === simSelectedPrinterId);
        const selectedSpeed = printSpeeds.find((s: DtfPrintSpeed) => s.id === simSelectedSpeedId);
        if (!selectedPrinter || !selectedSpeed) return null;

        const printableWidthMeters = (selectedPrinter.printable_width_mm || selectedPrinter.film_width_mm) / 1000;
        const speedSqmPerHour = selectedSpeed.speed_sqm_per_hour_min;
        let linearSpeedMetersPerHour = speedSqmPerHour / printableWidthMeters;
        const inkDensity = selectedSpeed.ink_density;
        if (inkDensity && inkDensity > 1) {
            linearSpeedMetersPerHour /= inkDensity;
        }

        return { 
            ...printSettings, 
            filmWidthMm: selectedPrinter.printable_width_mm || selectedPrinter.film_width_mm, 
            printSpeedMetersPerHour: linearSpeedMetersPerHour 
        };
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

    if (isLoading || !appData || !database) {
        return <div className="flex h-full w-full items-center justify-center"><SpinnerIcon className="w-12 h-12 text-brand-primary" /></div>;
    }
     if (error) {
        return <div className="p-4 text-red-500">{error}</div>;
    }

    const availableSpeeds = (printSpeeds || []).filter((s: DtfPrintSpeed) => s.printer_id === simSelectedPrinterId);
    const selectedSpeedInfo = (printSpeeds || []).find((s: DtfPrintSpeed) => s.id === simSelectedSpeedId);

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
export default DtfCostCalculatorTool;