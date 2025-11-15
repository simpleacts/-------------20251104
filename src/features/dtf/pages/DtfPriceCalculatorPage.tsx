import React, { useEffect, useMemo, useState } from 'react';
import { AppData } from '@shared/types';
import { DtfPrinter, DtfPrintSettings, DtfPrintSpeed } from '../types';
import DtfInputs from '../organisms/DtfInputs';
import DtfResult from '../organisms/DtfResult';
import { calculateDtfCost, DtfCalculationResult } from '../services/dtfService';

interface DtfPriceCalculatorProps {
    appData: AppData;
}

const DtfPriceCalculator: React.FC<DtfPriceCalculatorProps> = ({ appData }) => {
    const [logoWidth, setLogoWidth] = useState<number | ''>(''); // cm
    const [logoHeight, setLogoHeight] = useState<number | ''>(''); // cm
    const [logoQuantity, setLogoQuantity] = useState(100);
    const [profitMargin, setProfitMargin] = useState(appData.pricing.dtfProfitMargin || 2.0);
    const [selectedPrinterId, setSelectedPrinterId] = useState<number | ''>('');
    const [selectedSpeedId, setSelectedSpeedId] = useState<number | ''>('');

    useEffect(() => {
        const dbPrinters = (appData.dtfPrinters as DtfPrinter[]) || [];
        const defaultPrinter = dbPrinters.find(p => p.is_default) || dbPrinters[0];
        if (defaultPrinter) {
            setSelectedPrinterId(defaultPrinter.id);
            const speeds = ((appData.dtfPrintSpeeds as DtfPrintSpeed[]) || []).filter(s => s.printer_id === defaultPrinter.id);
            if (speeds.length > 0) {
                const defaultSpeed = speeds.find(s => s.is_default) || speeds[0];
                if (defaultSpeed) {
                    setSelectedSpeedId(defaultSpeed.id);
                }
            }
        }
    }, [appData.dtfPrinters, appData.dtfPrintSpeeds]);

    const dtfData = useMemo(() => ({
        consumables: appData.dtfConsumables,
        equipment: appData.dtfEquipment,
        laborCosts: appData.dtfLaborCosts,
        pressTimeCosts: appData.dtfPressTimeCosts,
        electricityRates: appData.dtfElectricityRates,
    }), [appData]);
    
    const availableSpeeds = useMemo(() => {
        if (!selectedPrinterId) return [];
        return appData.dtfPrintSpeeds.filter(s => s.printer_id === selectedPrinterId);
    }, [selectedPrinterId, appData.dtfPrintSpeeds]);

    const handlePrinterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPrinterId = Number(e.target.value);
        setSelectedPrinterId(newPrinterId);
        const newSpeeds = appData.dtfPrintSpeeds.filter(s => s.printer_id === newPrinterId);
        const defaultSpeed = newSpeeds.find(s => s.is_default) || newSpeeds[0];
        setSelectedSpeedId(defaultSpeed ? defaultSpeed.id : '');
    };

    const printSettings: DtfPrintSettings | null = useMemo(() => {
        const selectedPrinter = appData.dtfPrinters.find(p => p.id === selectedPrinterId);
        const selectedSpeed = appData.dtfPrintSpeeds.find(s => s.id === selectedSpeedId);
        
        if (!selectedPrinter || !selectedSpeed) return null;

        const printableWidthMeters = (selectedPrinter.printable_width_mm || selectedPrinter.film_width_mm) / 1000;
        const speedSqmPerHour = selectedSpeed.speed_sqm_per_hour_min;
        
        let linearSpeedMetersPerHour = speedSqmPerHour / printableWidthMeters;
        
        const inkDensity = selectedSpeed.ink_density;
        if (inkDensity && inkDensity > 1) {
            linearSpeedMetersPerHour /= inkDensity;
        }

        return {
            ...appData.dtfPrintSettings,
            filmWidthMm: selectedPrinter.printable_width_mm || selectedPrinter.film_width_mm,
            printSpeedMetersPerHour: linearSpeedMetersPerHour,
        };
    }, [appData, selectedPrinterId, selectedSpeedId]);

    const calculationResult = useMemo((): DtfCalculationResult | null => {
        if (Number(logoWidth) <= 0 || Number(logoHeight) <= 0 || logoQuantity <= 0 || !printSettings) return null;

        const roundUpTo10 = appData.pricing.dtfRoundUpTo10 ?? true;

        return calculateDtfCost({
            logoWidthMm: Number(logoWidth) * 10,
            logoHeightMm: Number(logoHeight) * 10,
            logoQuantity,
            profitMargin,
            roundUpTo10,
        }, dtfData, printSettings);

    }, [logoWidth, logoHeight, logoQuantity, profitMargin, dtfData, printSettings, appData.pricing.dtfRoundUpTo10]);
    
    const selectedSpeedInfo = useMemo(() => {
        return appData.dtfPrintSpeeds.find(s => s.id === selectedSpeedId);
    }, [selectedSpeedId, appData.dtfPrintSpeeds]);

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DtfInputs
                    logoWidth={logoWidth} setLogoWidth={setLogoWidth}
                    logoHeight={logoHeight} setLogoHeight={setLogoHeight}
                    logoQuantity={logoQuantity} setLogoQuantity={setLogoQuantity}
                    profitMargin={profitMargin} setProfitMargin={setProfitMargin}
                    printers={appData.dtfPrinters}
                    selectedPrinterId={selectedPrinterId}
                    handlePrinterChange={handlePrinterChange}
                    availableSpeeds={availableSpeeds}
                    selectedSpeedId={selectedSpeedId}
                    setSelectedSpeedId={setSelectedSpeedId}
                    selectedSpeedInfo={selectedSpeedInfo}
                />
                <DtfResult calculationResult={calculationResult} />
            </div>
        </div>
    );
};

export default DtfPriceCalculator;