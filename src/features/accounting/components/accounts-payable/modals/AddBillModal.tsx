
import React, { useEffect, useState } from 'react';
import { ImageFile, Row } from '@shared/types';
import { analyzeInvoice } from '@shared/services/geminiService';
import { SparklesIcon, SpinnerIcon, UploadIcon, XMarkIcon } from '@components/atoms';

interface AddBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { bill: Partial<Row>; newVendor?: { name: string } }) => void;
    vendors: Row[];
}

const fileToImageFile = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({ name: file.name, type: file.type, base64Data });
        };
        reader.onerror = error => reject(error);
    });
};

const AddBillModal: React.FC<AddBillModalProps> = ({ isOpen, onClose, onSave, vendors }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [billData, setBillData] = useState<Partial<Row>>({ status: 'unpaid' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFile(null);
            setPreviewUrl(null);
            setBillData({ status: 'unpaid' });
            setIsLoading(false);
            setError(null);
            setIsAddingNewVendor(false);
            setNewVendorName('');
        }
    }, [isOpen]);

    const handleFileChange = async (uploadedFile: File | null) => {
        if (!uploadedFile) return;
        setFile(uploadedFile);
        setPreviewUrl(URL.createObjectURL(uploadedFile));
        setError(null);
        setIsLoading(true);

        try {
            const imageFile = await fileToImageFile(uploadedFile);
            const analysisResult = await analyzeInvoice(imageFile);

            let matchedVendorId = '';
            if (analysisResult.vendor_name) {
                const lowerVendorName = analysisResult.vendor_name.toLowerCase().replace(/株式会社|有限会社|\(株\)|\（有\）/g, '').trim();
                const matchedVendor = vendors.find(v => 
                    (v.company_name || '').toLowerCase().replace(/株式会社|有限会社|\(株\)|\（有\）/g, '').trim().includes(lowerVendorName) || 
                    (v.name_kanji || '').toLowerCase().includes(lowerVendorName)
                );
                if (matchedVendor) {
                    matchedVendorId = matchedVendor.id;
                } else {
                    setIsAddingNewVendor(true);
                    setNewVendorName(analysisResult.vendor_name);
                }
            }
            
            const issueDate = analysisResult.issue_date;
            setBillData({
                customer_id: matchedVendorId,
                invoice_number: analysisResult.invoice_number,
                issue_date: issueDate,
                due_date: analysisResult.due_date,
                total_amount: analysisResult.total_amount,
                status: 'unpaid',
                notes: `Uploaded file: ${uploadedFile.name}`,
                billing_month: issueDate ? issueDate.substring(0, 7) : '',
            });

        } catch (e) {
            setError(e instanceof Error ? e.message : '解析に失敗しました。手動で入力してください。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };
    
    const handleChange = (field: string, value: any) => {
        setBillData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'issue_date' && value) {
                newData.billing_month = (value as string).substring(0, 7);
            }
            return newData;
        });
    };

    const handleSave = () => {
        if (!isAddingNewVendor && !billData.customer_id) {
            setError('取引先を選択してください。');
            return;
        }
        if (isAddingNewVendor && !newVendorName.trim()) {
            setError('新規取引先名を入力してください。');
            return;
        }
        
        const dataToSave = {
            bill: billData,
            ...(isAddingNewVendor && { newVendor: { name: newVendorName }})
        };

        onSave(dataToSave);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">新規支払いを登録</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="flex-grow flex overflow-hidden">
                    <div className="w-1/2 p-4 border-r flex flex-col">
                        {previewUrl ? (
                            <div className="flex-grow border rounded-md overflow-auto">
                                {file?.type === 'application/pdf' ? (
                                    <iframe src={previewUrl} className="w-full h-full" title="Invoice Preview"/>
                                ) : (
                                    <img src={previewUrl} alt="Invoice Preview" className="w-full h-auto"/>
                                )}
                            </div>
                        ) : (
                            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} className="h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-secondary" onClick={() => document.getElementById('bill-upload-input')?.click()}>
                                <input id="bill-upload-input" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileChange(e.target.files?.[0] || null)}/>
                                <UploadIcon className="w-12 h-12 text-gray-400"/>
                                <p className="mt-4 font-semibold">請求書ファイルをここにドラッグ＆ドロップ</p>
                                <p className="text-sm text-gray-500">またはクリックして選択</p>
                            </div>
                        )}
                    </div>
                    <div className="w-1/2 p-6 space-y-4 overflow-y-auto">
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-800 dark:text-blue-200">
                            <SparklesIcon className="w-8 h-8 flex-shrink-0"/>
                            <span>請求書をアップロードすると、AIが内容を自動で読み取り入力します。</span>
                        </div>
                        {isLoading && <div className="flex items-center gap-2 text-sm"><SpinnerIcon className="w-5 h-5"/>AIが解析中...</div>}
                        {error && <div className="p-2 text-sm bg-red-100 text-red-700 rounded">{error}</div>}
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">取引先 (仕入先)</label>
                            <select value={isAddingNewVendor ? '__NEW__' : billData.customer_id || ''} onChange={e => {
                                if (e.target.value === '__NEW__') {
                                    setIsAddingNewVendor(true);
                                    handleChange('customer_id', '');
                                } else {
                                    setIsAddingNewVendor(false);
                                    setNewVendorName('');
                                    handleChange('customer_id', e.target.value);
                                }
                            }} className="w-full p-2 border rounded">
                                <option value="">選択してください...</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name || v.name_kanji}</option>)}
                                <option value="__NEW__">** 新規取引先を追加... **</option>
                            </select>
                            {isAddingNewVendor && (
                                <input type="text" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="新規取引先名" className="w-full p-2 border rounded mt-2"/>
                            )}
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">請求書番号</label>
                            <input type="text" value={billData.invoice_number || ''} onChange={e => handleChange('invoice_number', e.target.value)} className="w-full p-2 border rounded"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">発行日</label>
                                <input type="date" value={billData.issue_date || ''} onChange={e => handleChange('issue_date', e.target.value)} className="w-full p-2 border rounded"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">支払期限</label>
                                <input type="date" value={billData.due_date || ''} onChange={e => handleChange('due_date', e.target.value)} className="w-full p-2 border rounded"/>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">請求月</label>
                            <input
                                type="month"
                                value={billData.billing_month || (billData.issue_date ? (billData.issue_date as string).substring(0, 7) : '')}
                                onChange={e => handleChange('billing_month', e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">合計金額 (税込)</label>
                            <input type="number" value={billData.total_amount || ''} onChange={e => handleChange('total_amount', Number(e.target.value))} className="w-full p-2 border rounded"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">メモ</label>
                            <textarea value={billData.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={3} className="w-full p-2 border rounded"/>
                        </div>
                    </div>
                </main>
                 <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm rounded-md bg-brand-primary text-white">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default AddBillModal;
