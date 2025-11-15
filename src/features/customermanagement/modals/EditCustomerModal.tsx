import React, { useEffect, useState } from 'react';
import { Row } from '@shared/types';
import { SpinnerIcon, XMarkIcon } from '@components/atoms';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerData: Row;
    onSave: (updatedData: Row) => void;
    prefectures: Row[];
    customerGroups: Row[];
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ isOpen, onClose, customerData, onSave, prefectures, customerGroups }) => {
    const [formData, setFormData] = useState<Row>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
    const [addressWithoutPref, setAddressWithoutPref] = useState<string>('');
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);

    const [showShippingAddress, setShowShippingAddress] = useState(false);
    const [shippingSelectedPrefecture, setShippingSelectedPrefecture] = useState<string>('');
    const [shippingAddressWithoutPref, setShippingAddressWithoutPref] = useState<string>('');
    const [isSearchingShippingAddress, setIsSearchingShippingAddress] = useState(false);

    useEffect(() => {
        if (customerData) {
            if (customerData.isNew) {
                const newCustomerTemplate: Row = {
                    isNew: true,
                    company_name: '', name_kanji: '', name_kana: '', email: '', phone: '',
                    zip_code: '', address1: '', address2: '', internal_notes: '',
                    customer_group_id: customerGroups[0]?.id || '',
                    status: 'active',
                    is_vendor: false,
                    has_separate_shipping_address: false,
                    shipping_name: '', shipping_phone: '', shipping_zip_code: '',
                    shipping_address1: '', shipping_address2: ''
                };
                setFormData(newCustomerTemplate);
                setShowShippingAddress(false);
                setSelectedPrefecture('');
                setAddressWithoutPref('');
                setShippingSelectedPrefecture('');
                setShippingAddressWithoutPref('');
            } else {
                setFormData(customerData);
                setShowShippingAddress(!!customerData.has_separate_shipping_address);
    
                const splitAddress = (address: string) => {
                    let foundPref = '';
                    let restOfAddress = address;
                    for (const pref of prefectures) {
                        if (address.startsWith(pref.name as string)) {
                            foundPref = pref.name as string;
                            restOfAddress = address.substring(foundPref.length);
                            break;
                        }
                    }
                    return { prefecture: foundPref, rest: restOfAddress };
                };
    
                const mainAddr = splitAddress((customerData.address1 as string) || '');
                setSelectedPrefecture(mainAddr.prefecture);
                setAddressWithoutPref(mainAddr.rest);
    
                const shippingAddr = splitAddress((customerData.shipping_address1 as string) || '');
                setShippingSelectedPrefecture(shippingAddr.prefecture);
                setShippingAddressWithoutPref(shippingAddr.rest);
            }
        }
        setErrors({}); // Clear errors on open
    }, [customerData, prefectures, customerGroups]);

    if (!isOpen) return null;

    const validate = (data: Row): boolean => {
        const newErrors: Record<string, string> = {};

        if (!data.company_name && !data.name_kanji) {
            newErrors.name_kanji = '会社名または氏名のいずれかは必須です。';
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email as string)) {
            newErrors.email = '有効なメールアドレスを入力してください。';
        }
        if (data.zip_code && !/^\d{7}$/.test(data.zip_code as string)) {
            newErrors.zip_code = '7桁の郵便番号をハイフンなしで入力してください。';
        }

        if (data.has_separate_shipping_address) {
            if (data.shipping_zip_code && !/^\d{7}$/.test(data.shipping_zip_code as string)) {
                 newErrors.shipping_zip_code = '7桁の郵便番号をハイフンなしで入力してください。';
            }
            if (!data.shipping_name) {
                newErrors.shipping_name = '宛名は必須です。';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleAddressFromZip = async (
        zipCode: string,
        setPref: (val: string) => void,
        setAddr: (val: string) => void,
        setLoading: (val: boolean) => void,
        errorField: string
    ) => {
        if (!zipCode || !/^\d{7}$/.test(zipCode)) {
            setErrors(prev => ({...prev, [errorField]: '7桁の郵便番号をハイフンなしで入力してください。'}));
            return;
        }
        setLoading(true);
        setErrors(prev => { const newErrors = {...prev}; delete newErrors[errorField]; return newErrors; });
        try {
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipCode}`);
            const data = await response.json();
            if (data.status === 200 && data.results) {
                const result = data.results[0];
                setPref(result.address1); // 都道府県
                setAddr(result.address2 + result.address3); // 市区町村 + 町域名
            } else {
                setErrors(prev => ({...prev, [errorField]: data.message || '住所が見つかりませんでした。'}));
            }
        } catch (error) {
            setErrors(prev => ({...prev, [errorField]: '住所の検索中にエラーが発生しました。'}));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...formData };
        finalData.address1 = selectedPrefecture + addressWithoutPref;
        finalData.has_separate_shipping_address = showShippingAddress;

        if (showShippingAddress) {
            finalData.shipping_address1 = shippingSelectedPrefecture + shippingAddressWithoutPref;
        } else {
            finalData.shipping_name = '';
            finalData.shipping_phone = '';
            finalData.shipping_zip_code = '';
            finalData.shipping_address1 = '';
            finalData.shipping_address2 = '';
        }
        
        if (!validate(finalData)) {
            return;
        }

        onSave(finalData);
    };

    const renderAddressFields = (
        type: 'main' | 'shipping'
    ) => {
        const isShipping = type === 'shipping';
        const zipCode = isShipping ? formData.shipping_zip_code : formData.zip_code;
        const selectedPref = isShipping ? shippingSelectedPrefecture : selectedPrefecture;
        const setSelectedPref = isShipping ? setShippingSelectedPrefecture : setSelectedPrefecture;
        const addrWithoutPref = isShipping ? shippingAddressWithoutPref : addressWithoutPref;
        const setAddrWithoutPref = isShipping ? setShippingAddressWithoutPref : setAddressWithoutPref;
        const addr2 = isShipping ? formData.shipping_address2 : formData.address2;
        const isSearching = isShipping ? isSearchingShippingAddress : isSearchingAddress;
        const setIsSearching = isShipping ? setIsSearchingShippingAddress : setIsSearchingAddress;
        const zipField = isShipping ? 'shipping_zip_code' : 'zip_code';
        const addr2Field = isShipping ? 'shipping_address2' : 'address2';

        return (
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">郵便番号</label>
                    <div className="flex items-center gap-2">
                        <input type="text" value={zipCode || ''} onChange={e => handleChange(zipField, e.target.value)} maxLength={7} className={`w-full bg-input-bg dark:bg-input-bg-dark border rounded-md px-3 py-2 text-sm ${errors[zipField] ? 'border-red-500' : 'border-default dark:border-default-dark'}`} />
                        <button type="button" onClick={() => handleAddressFromZip(zipCode as string, setSelectedPref, setAddrWithoutPref, setIsSearching, zipField)} disabled={isSearching} className="px-3 py-2 text-sm bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark rounded-md disabled:opacity-50 flex items-center gap-1">
                            {isSearching ? <SpinnerIcon className="w-4 h-4" /> : '住所検索'}
                        </button>
                    </div>
                     {errors[zipField] && <p className="text-xs text-red-500 mt-1">{errors[zipField]}</p>}
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">住所1 (都道府県・市区町村・町名)</label>
                    <div className="flex items-center gap-2">
                        <select value={selectedPref} onChange={e => setSelectedPref(e.target.value)} className="w-1/3 bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm">
                            <option value="">都道府県</option>
                            {prefectures.map(p => <option key={p.id as string} value={p.name as string}>{p.name}</option>)}
                        </select>
                        <input type="text" value={addrWithoutPref} onChange={e => setAddrWithoutPref(e.target.value)} className="w-2/3 bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm" placeholder="市区町村以降"/>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">住所2 (番地・ビル名など)</label>
                    <input type="text" value={addr2 || ''} onChange={e => handleChange(addr2Field, e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm" />
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <h2 className="text-xl font-bold">{formData.isNew ? '新規顧客登録' : '顧客情報編集'}</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">基本情報</h3>
                            <div>
                                <label className="block text-sm font-medium mb-1">会社名</label>
                                <input type="text" value={formData.company_name || ''} onChange={e => handleChange('company_name', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">氏名</label><input type="text" value={formData.name_kanji || ''} onChange={e => handleChange('name_kanji', e.target.value)} className={`w-full bg-input-bg dark:bg-input-bg-dark border rounded-md px-3 py-2 text-sm ${errors.name_kanji ? 'border-red-500' : 'border-default dark:border-default-dark'}`} /></div>
                                <div><label className="block text-sm font-medium mb-1">氏名(カナ)</label><input type="text" value={formData.name_kana || ''} onChange={e => handleChange('name_kana', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm" /></div>
                            </div>
                            {errors.name_kanji && <p className="text-xs text-red-500 -mt-3">{errors.name_kanji}</p>}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">メールアドレス</label>
                                    <input type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} className={`w-full bg-input-bg dark:bg-input-bg-dark border rounded-md px-3 py-2 text-sm ${errors.email ? 'border-red-500' : 'border-default dark:border-default-dark'}`} />
                                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                                </div>
                                <div><label className="block text-sm font-medium mb-1">電話番号</label><input type="tel" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm" /></div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">顧客グループ</label>
                                    <select value={formData.customer_group_id || ''} onChange={e => handleChange('customer_group_id', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm">
                                        {customerGroups.map(g => <option key={g.id as string} value={g.id as string}>{g.name as string}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ステータス</label>
                                    <select value={formData.status || 'active'} onChange={e => handleChange('status', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm">
                                        <option value="active">アクティブ</option>
                                        <option value="inactive">休眠</option>
                                        <option value="suspended">取引停止</option>
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!formData.is_vendor} onChange={e => handleChange('is_vendor', e.target.checked)} /> この取引先は仕入先でもある</label>
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">内部メモ</label>
                                <textarea value={formData.internal_notes || ''} onChange={e => handleChange('internal_notes', e.target.value)} rows={3} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm"/>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">登録住所</h3>
                            {renderAddressFields('main')}
                            <div className="pt-4 border-t border-default dark:border-default-dark">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={showShippingAddress} onChange={e => setShowShippingAddress(e.target.checked)} />
                                    <span>別の納品先住所を指定する</span>
                                </label>
                            </div>
                            {showShippingAddress && (
                                <div className="space-y-4 pt-4 border-t border-dashed">
                                    <h3 className="text-lg font-semibold">納品先住所</h3>
                                     <div>
                                        <label className="block text-sm font-medium mb-1">宛名</label>
                                        <input type="text" value={formData.shipping_name || ''} onChange={e => handleChange('shipping_name', e.target.value)} className={`w-full bg-input-bg dark:bg-input-bg-dark border rounded-md px-3 py-2 text-sm ${errors.shipping_name ? 'border-red-500' : 'border-default dark:border-default-dark'}`} />
                                        {errors.shipping_name && <p className="text-xs text-red-500 mt-1">{errors.shipping_name}</p>}
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium mb-1">電話番号</label>
                                        <input type="tel" value={formData.shipping_phone || ''} onChange={e => handleChange('shipping_phone', e.target.value)} className="w-full bg-input-bg dark:bg-input-bg-dark border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm" />
                                    </div>
                                    {renderAddressFields('shipping')}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90">
                        キャンセル
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90">
                        保存
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default EditCustomerModal;