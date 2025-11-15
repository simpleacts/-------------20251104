import React from 'react';
import { DtfPrinter, DtfPrintSpeed } from '../types';

interface DtfInputsProps {
    logoWidth: number | '';
    setLogoWidth: (value: number | '') => void;
    logoHeight: number | '';
    setLogoHeight: (value: number | '') => void;
    logoQuantity: number;
    setLogoQuantity: (value: number) => void;
    profitMargin: number;
    setProfitMargin: (value: number) => void;
    printers: DtfPrinter[];
    selectedPrinterId: number | '';
    handlePrinterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    availableSpeeds: DtfPrintSpeed[];
    selectedSpeedId: number | '';
    setSelectedSpeedId: (value: number | '') => void;
    selectedSpeedInfo?: DtfPrintSpeed;
}

const DtfInputs: React.FC<DtfInputsProps> = (props) => {
    const {
        logoWidth, setLogoWidth, logoHeight, setLogoHeight, logoQuantity, setLogoQuantity,
        profitMargin, setProfitMargin, printers, selectedPrinterId, handlePrinterChange,
        availableSpeeds, selectedSpeedId, setSelectedSpeedId, selectedSpeedInfo
    } = props;
    
    return (
        <div className="bg-container-muted-bg dark:bg-container-muted-bg-dark p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-2xl font-bold text-center mb-4">DTF料金単価計算</h2>
            <div>
                <label htmlFor="dtf-logo-width-input" className="block text-sm font-medium mb-1">ロゴの幅 (cm)</label>
                <input id="dtf-logo-width-input" name="logo_width" type="number" value={logoWidth === 0 ? '' : logoWidth} onChange={e => { const val = e.target.value; if (val === '') { setLogoWidth(''); } else { const num = parseInt(val, 10); if (!isNaN(num)) setLogoWidth(num); } }} placeholder="0" className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border border-base-300 dark:border-base-dark-300 rounded-md" />
            </div>
            <div>
                <label htmlFor="dtf-logo-height-input" className="block text-sm font-medium mb-1">ロゴの高さ (cm)</label>
                <input id="dtf-logo-height-input" name="logo_height" type="number" value={logoHeight === 0 ? '' : logoHeight} onChange={e => { const val = e.target.value; if (val === '') { setLogoHeight(''); } else { const num = parseInt(val, 10); if (!isNaN(num)) setLogoHeight(num); } }} placeholder="0" className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border border-base-300 dark:border-base-dark-300 rounded-md" />
            </div>
            <div>
                <label htmlFor="dtf-logo-quantity-input" className="block text-sm font-medium mb-1">数量</label>
                <input id="dtf-logo-quantity-input" name="logo_quantity" type="number" value={logoQuantity === 0 ? '' : logoQuantity} onChange={e => setLogoQuantity(Number(e.target.value))} placeholder="0" className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border border-base-300 dark:border-base-dark-300 rounded-md" />
            </div>
             <div>
                <label htmlFor="dtf-profit-margin-input" className="block text-sm font-medium mb-1">利益率（掛率）</label>
                <input id="dtf-profit-margin-input" name="profit_margin" type="number" step="0.1" value={profitMargin === 0 ? '' : profitMargin} onChange={e => setProfitMargin(Number(e.target.value))} placeholder="0" className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border border-base-300 dark:border-base-dark-300 rounded-md" />
            </div>
            <div>
                <label htmlFor="dtf-printer-select" className="block text-sm font-medium mb-1">プリンター</label>
                <select id="dtf-printer-select" name="printer_id" value={selectedPrinterId} onChange={handlePrinterChange} className="w-full p-2 border border-default rounded-md bg-base-200 dark:bg-base-dark-300">
                    {printers.map((p: DtfPrinter) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="dtf-speed-select" className="block text-sm font-medium mb-1">印刷速度設定</label>
                <select id="dtf-speed-select" name="speed_id" value={selectedSpeedId} onChange={e => setSelectedSpeedId(Number(e.target.value))} className="w-full p-2 border border-default rounded-md bg-base-200 dark:bg-base-dark-300">
                    {availableSpeeds.map((s: DtfPrintSpeed) => <option key={s.id} value={s.id}>{s.resolution_dpi} {s.pass_count}pass ({s.notes || '標準'})</option>)}
                </select>
                {selectedSpeedInfo && <p className="text-xs text-gray-500 mt-1">選択中の設定 - インク濃度: {selectedSpeedInfo.ink_density ?? 'N/A'}</p>}
            </div>
        </div>
    );
};

export default DtfInputs;
