import React, { useState } from 'react';
import { Row } from '@shared/types';
import { PrinterIcon, XMarkIcon } from '@components/atoms';
import { generateAndDownloadPDF, generateAndOpenPDFForPrint } from '@shared/utils/pdfGenerator';

interface PricingSchedulePdfModalProps {
    isOpen: boolean;
    onClose: () => void;
    schedule: Row;
    tiers: Row[];
}

export const PricingSchedulePdfModal: React.FC<PricingSchedulePdfModalProps> = ({ isOpen, onClose, schedule, tiers }) => {
    if (!isOpen) return null;

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const sortedTiers = [...tiers].sort((a, b) => (a.min as number) - (b.min as number));

    const preparePdfData = () => {
        // 価格表のHTMLコンテンツを生成
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'ipa', sans-serif; color: #000; font-size: 10pt; padding: 20px; }
                    h1 { font-size: 24pt; text-align: center; margin-bottom: 10px; font-weight: bold; }
                    h2 { font-size: 18pt; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; }
                    th { background-color: #e0e0e0; font-weight: bold; text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    footer { margin-top: 30px; text-align: right; font-size: 9pt; color: #666; }
                </style>
            </head>
            <body>
                <h1>プリント単価表</h1>
                <h2>${schedule.name}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>枚数範囲</th>
                            <th>価格モデル</th>
                            <th>1色目</th>
                            <th>追加色</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTiers.map(tier => {
                            const isLump = (tier.additionalColor as number) < 0;
                            const modelLabel = isLump ? '一括価格制' : '単価制';
                            const firstColor = tier.firstColor;
                            const additionalColor = isLump
                                ? (tier.additionalColor === -1 ? 0 : Math.abs(tier.additionalColor as number))
                                : tier.additionalColor;
                            return `
                                <tr>
                                    <td>${tier.min} ~ ${tier.max}</td>
                                    <td>${modelLabel}</td>
                                    <td class="text-right">¥${Number(firstColor).toLocaleString()} ${isLump ? '(一括)' : '/枚'}</td>
                                    <td class="text-right">¥${Number(additionalColor).toLocaleString()} ${isLump ? '(一括)' : '/枚'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <footer>
                    <p>発行日: ${new Date().toLocaleDateString('ja-JP')}</p>
                </footer>
            </body>
            </html>
        `;

        return {
            type: 'pricing_schedule' as const,
            data: {
                htmlContent,
                scheduleName: schedule.name,
            },
            filename: `価格表_${schedule.name}_${new Date().toISOString().split('T')[0]}.pdf`
        };
    };

    const handlePrint = async () => {
        if (isGeneratingPDF) return;
        setIsGeneratingPDF(true);
        try {
            const pdfData = preparePdfData();
            await generateAndOpenPDFForPrint(pdfData);
        } catch (error) {
            console.error('Failed to generate PDF for print:', error);
            alert('PDFの生成に失敗しました。');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (isGeneratingPDF) return;
        setIsGeneratingPDF(true);
        try {
            const pdfData = preparePdfData();
            await generateAndDownloadPDF(pdfData);
        } catch (error) {
            console.error('Failed to download PDF:', error);
            alert('PDFのダウンロードに失敗しました。');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const renderContent = () => (
        <div className="p-8 font-sans text-black bg-white">
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .printable-area, .printable-area * {
                            visibility: visible;
                        }
                        .printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                    }
                `}
            </style>
            <h1 className="text-3xl font-bold mb-2 text-gray-800">プリント単価表</h1>
            <h2 className="text-xl mb-6 border-b pb-2 text-gray-600">{schedule.name}</h2>
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-semibold text-gray-700">枚数範囲</th>
                        <th className="border border-gray-300 p-2 text-left font-semibold text-gray-700">価格モデル</th>
                        <th className="border border-gray-300 p-2 text-right font-semibold text-gray-700">1色目</th>
                        <th className="border border-gray-300 p-2 text-right font-semibold text-gray-700">追加色</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTiers.map((tier, index) => {
                        const isLump = (tier.additionalColor as number) < 0;
                        const modelLabel = isLump ? '一括価格制' : '単価制';
                        const firstColor = tier.firstColor;
                        const additionalColor = isLump
                            ? (tier.additionalColor === -1 ? 0 : Math.abs(tier.additionalColor as number))
                            : tier.additionalColor;
                        
                        return (
                            <tr key={index} className="even:bg-gray-50">
                                <td className="border border-gray-300 p-2 font-mono">{tier.min} ~ {tier.max}</td>
                                <td className="border border-gray-300 p-2">{modelLabel}</td>
                                <td className="border border-gray-300 p-2 text-right font-mono">
                                    ¥{Number(firstColor).toLocaleString()} {isLump ? '(一括)' : '/枚'}
                                </td>
                                <td className="border border-gray-300 p-2 text-right font-mono">
                                    ¥{Number(additionalColor).toLocaleString()} {isLump ? '(一括)' : '/枚'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <footer className="mt-8 text-xs text-gray-500 text-right">
                <p>発行日: {new Date().toLocaleDateString('ja-JP')}</p>
            </footer>
        </div>
    );

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 print:hidden" onClick={onClose}>
                <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark flex-shrink-0">
                        <h2 className="text-xl font-bold">PDFプレビュー: {schedule.name}</h2>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handlePrint} 
                                disabled={isGeneratingPDF}
                                className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md"
                            >
                                <PrinterIcon className="w-5 h-5"/> 
                                {isGeneratingPDF ? '生成中...' : '印刷'}
                            </button>
                            <button 
                                onClick={handleDownloadPDF} 
                                disabled={isGeneratingPDF}
                                className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md"
                            >
                                PDF
                                {isGeneratingPDF ? '...' : ''}
                            </button>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </header>
                    <main className="flex-grow overflow-auto bg-gray-200 dark:bg-gray-800 p-8">
                        <div className="A4-paper bg-white shadow-lg mx-auto printable-area">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
            <div className="hidden print:block printable-area">
                {renderContent()}
            </div>
        </>
    );
};
