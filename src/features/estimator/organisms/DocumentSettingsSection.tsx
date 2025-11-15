import React, { useState, useMemo, useEffect } from 'react';
import { Database, Row } from '@shared/types';
import { ToggleSwitch } from '@components/atoms';

interface DocumentSettingsSectionProps {
    documentType: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt';
    database: Database;
    selectedTemplateId: string | null;
    onTemplateIdChange: (templateId: string | null) => void;
    onSettingsChange?: (settings: DocumentSettings) => void; // 設定変更時のコールバック
    initialSettings?: Partial<DocumentSettings>; // 初期設定
}

interface DocumentSettings {
    templateId: string | null;
    // 共通設定
    documentTitle?: string; // 帳票名（ファイル名に使用）
    showLogo?: boolean;
    showSeal?: boolean; // 印影
    
    // 見積書設定
    showIssueDate?: boolean; // 発行日
    showValidUntil?: boolean; // 有効期限
    
    // 納品書設定
    showDeliveryDate?: boolean; // 納品日
    
    // 請求書設定
    salesRecordDate?: string; // 売上計上日
    createAccountEntry?: boolean; // 入金予定の仕訳（売掛に登録）作成する
    showInvoiceDate?: boolean; // 請求日
    showPaymentDueDate?: boolean; // 支払い期限
    showDeliverySlipNumber?: boolean; // 納品書番号
    
    // 共通表示設定
    showUnit?: boolean; // 単位
    
    // 端数処理
    itemRounding?: 'floor' | 'ceil' | 'round'; // 明細行ごとの端数処理
    taxRounding?: 'floor' | 'ceil' | 'round'; // 消費税の端数処理
    
    // 消費税設定
    taxDisplayMode?: 'exclusive' | 'inclusive'; // 外税・内税
    showTaxWhenZero?: boolean; // 消費税が0円の場合表示
    showTaxFreeBreakdown?: boolean; // 課税対象外の内訳欄表示
    
    // 既存設定（後方互換性のため）
    paymentMethod?: string;
    paymentDueDate?: string;
    notes?: string;
}

const DocumentSettingsSection: React.FC<DocumentSettingsSectionProps> = ({
    documentType,
    database,
    selectedTemplateId,
    onTemplateIdChange,
    onSettingsChange,
    initialSettings,
}) => {
    const [settings, setSettings] = useState<DocumentSettings>({
        templateId: selectedTemplateId,
        showLogo: true,
        showSeal: true,
        showUnit: true,
        itemRounding: 'round',
        taxRounding: 'round',
        taxDisplayMode: 'exclusive',
        showTaxWhenZero: true,
        showTaxFreeBreakdown: false,
        ...initialSettings,
    });

    // テンプレートを取得
    const templates = useMemo(() => {
        const typeMap = {
            'estimate': 'estimate',
            'delivery_slip': 'delivery_slip',
            'invoice': 'invoice',
            'receipt': 'receipt'
        };
        return database.pdf_templates?.data.filter(t => t.type === typeMap[documentType]) || [];
    }, [database.pdf_templates, documentType]);

    // 支払方法を取得（sort_orderでソート）
    const paymentMethods = useMemo(() => {
        const methods = database.payment_methods?.data || [];
        return [...methods].sort((a, b) => {
            const aOrder = (a.sort_order as number) || 0;
            const bOrder = (b.sort_order as number) || 0;
            return aOrder - bOrder;
        });
    }, [database.payment_methods]);

    const documentTypeLabels: Record<string, string> = {
        'estimate': '見積書',
        'invoice': '請求書',
        'delivery_slip': '納品書',
        'receipt': '領収書'
    };

    useEffect(() => {
        setSettings(prev => ({ ...prev, templateId: selectedTemplateId }));
    }, [selectedTemplateId]);

    const updateSetting = <K extends keyof DocumentSettings>(key: K, value: DocumentSettings[K]) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            // 設定変更を親コンポーネントに通知
            if (onSettingsChange) {
                onSettingsChange(newSettings);
            }
            return newSettings;
        });
    };

    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md border border-base-200 dark:border-base-dark-300">
            <h2 className="text-xl font-bold mb-4">3. {documentTypeLabels[documentType]}設定</h2>
            <p className="text-xs text-muted dark:text-muted-dark mb-4">
                この詳細設定は、いま作成している{documentTypeLabels[documentType]}のみで適用される設定です。<br />
                サービス全体の設定については、「帳票設定」より設定を行ってください。
            </p>
            
            {/* PDFテンプレート選択 */}
            <div className="mb-6">
                <label htmlFor="pdf-template-select" className="block text-sm font-medium mb-1">PDFテンプレート</label>
                <select
                    id="pdf-template-select"
                    name="pdf-template-select"
                    value={selectedTemplateId || ''}
                    onChange={e => {
                        const templateId = e.target.value || null;
                        onTemplateIdChange(templateId);
                        updateSetting('templateId', templateId);
                    }}
                    className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                >
                    <option value="">テンプレートを選択してください</option>
                    {templates.map(template => (
                        <option key={template.id as string} value={template.id as string}>
                            {template.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 帳票名（ファイル名に使用） */}
            <div className="mb-6">
                <label htmlFor="document-title" className="block text-sm font-medium mb-1">
                    {documentTypeLabels[documentType]}名（{documentTypeLabels[documentType]}タイトル）
                </label>
                <input
                    id="document-title"
                    name="document-title"
                    type="text"
                    value={settings.documentTitle || ''}
                    onChange={e => updateSetting('documentTitle', e.target.value)}
                    placeholder={`${documentTypeLabels[documentType]}名を入力`}
                    className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted dark:text-muted-dark mt-1">
                    ここでファイル名に入る名前を設定します。
                </p>
            </div>

            {/* 表示の設定 */}
            <div className="mb-6 space-y-4">
                <h3 className="text-lg font-semibold">表示の設定</h3>
                
                <div className="flex items-center justify-between">
                    <label htmlFor="doc-settings-show-logo" className="text-sm font-medium">ロゴ</label>
                    <ToggleSwitch
                        id="doc-settings-show-logo"
                        name="show-logo"
                        checked={settings.showLogo ?? true}
                        onChange={(checked) => updateSetting('showLogo', checked)}
                    />
                    <span className="text-xs text-muted dark:text-muted-dark ml-2">表示する</span>
                </div>

                <div className="flex items-center justify-between">
                    <label htmlFor="doc-settings-show-seal" className="text-sm font-medium">印影</label>
                    <ToggleSwitch
                        id="doc-settings-show-seal"
                        name="show-seal"
                        checked={settings.showSeal ?? true}
                        onChange={(checked) => updateSetting('showSeal', checked)}
                    />
                    <span className="text-xs text-muted dark:text-muted-dark ml-2">表示する</span>
                </div>
                <p className="text-xs text-muted dark:text-muted-dark">
                    ※ 会社情報の設定ツールがあったほうがいいかもしれません（PDFプレビューでも使用する）
                </p>

                {/* 見積書固有の表示設定 */}
                {documentType === 'estimate' && (
                    <>
                        <div className="flex items-center justify-between">
                            <label htmlFor="doc-settings-show-issue-date" className="text-sm font-medium">発行日</label>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch
                                    id="doc-settings-show-issue-date"
                                    name="show-issue-date"
                                    checked={settings.showIssueDate ?? true}
                                    onChange={(checked) => updateSetting('showIssueDate', checked)}
                                />
                                <span className="text-xs text-muted dark:text-muted-dark">
                                    {settings.showIssueDate ? '表示する' : '表示しない'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="doc-settings-show-valid-until" className="text-sm font-medium">有効期限</label>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch
                                    id="doc-settings-show-valid-until"
                                    name="show-valid-until"
                                    checked={settings.showValidUntil ?? true}
                                    onChange={(checked) => updateSetting('showValidUntil', checked)}
                                />
                                <span className="text-xs text-muted dark:text-muted-dark">
                                    {settings.showValidUntil ? '表示する' : '表示しない'}
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* 納品書固有の表示設定 */}
                {documentType === 'delivery_slip' && (
                    <div className="flex items-center justify-between">
                        <label htmlFor="doc-settings-show-delivery-date" className="text-sm font-medium">納品日</label>
                        <div className="flex items-center gap-2">
                            <ToggleSwitch
                                id="doc-settings-show-delivery-date"
                                name="show-delivery-date"
                                checked={settings.showDeliveryDate ?? true}
                                onChange={(checked) => updateSetting('showDeliveryDate', checked)}
                            />
                            <span className="text-xs text-muted dark:text-muted-dark">
                                {settings.showDeliveryDate ? '表示する' : '表示しない'}
                            </span>
                        </div>
                    </div>
                )}

                {/* 請求書固有の表示設定 */}
                {documentType === 'invoice' && (
                    <>
                        <div>
                            <label htmlFor="sales-record-date" className="block text-sm font-medium mb-1">売上計上日</label>
                            <input
                                id="sales-record-date"
                                name="sales-record-date"
                                type="date"
                                value={settings.salesRecordDate || ''}
                                onChange={e => updateSetting('salesRecordDate', e.target.value)}
                                className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="doc-settings-create-account-entry" className="text-sm font-medium">請求書に対応した入金予定の仕訳（売掛に登録）作成する</label>
                            <ToggleSwitch
                                id="doc-settings-create-account-entry"
                                name="create-account-entry"
                                checked={settings.createAccountEntry ?? false}
                                onChange={(checked) => updateSetting('createAccountEntry', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="doc-settings-show-invoice-date" className="text-sm font-medium">請求日</label>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch
                                    id="doc-settings-show-invoice-date"
                                    name="show-invoice-date"
                                    checked={settings.showInvoiceDate ?? true}
                                    onChange={(checked) => updateSetting('showInvoiceDate', checked)}
                                />
                                <span className="text-xs text-muted dark:text-muted-dark">
                                    {settings.showInvoiceDate ? '表示する' : '表示しない'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="doc-settings-show-payment-due-date" className="text-sm font-medium">支払い期限</label>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch
                                    id="doc-settings-show-payment-due-date"
                                    name="show-payment-due-date"
                                    checked={settings.showPaymentDueDate ?? true}
                                    onChange={(checked) => updateSetting('showPaymentDueDate', checked)}
                                />
                                <span className="text-xs text-muted dark:text-muted-dark">
                                    {settings.showPaymentDueDate ? '表示する' : '表示しない'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="doc-settings-show-delivery-date-invoice" className="text-sm font-medium">納品日</label>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch
                                    id="doc-settings-show-delivery-date-invoice"
                                    name="show-delivery-date-invoice"
                                    checked={settings.showDeliveryDate ?? true}
                                    onChange={(checked) => updateSetting('showDeliveryDate', checked)}
                                />
                                <span className="text-xs text-muted dark:text-muted-dark">
                                    {settings.showDeliveryDate ? '表示する' : '表示しない'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="doc-settings-show-delivery-slip-number" className="text-sm font-medium">納品書番号</label>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch
                                    id="doc-settings-show-delivery-slip-number"
                                    name="show-delivery-slip-number"
                                    checked={settings.showDeliverySlipNumber ?? true}
                                    onChange={(checked) => updateSetting('showDeliverySlipNumber', checked)}
                                />
                                <span className="text-xs text-muted dark:text-muted-dark">
                                    {settings.showDeliverySlipNumber ? '表示する' : '表示しない'}
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* 共通表示設定 */}
                <div className="flex items-center justify-between">
                    <label htmlFor="doc-settings-show-unit" className="text-sm font-medium">単位</label>
                    <div className="flex items-center gap-2">
                        <ToggleSwitch
                            id="doc-settings-show-unit"
                            name="show-unit"
                            checked={settings.showUnit ?? true}
                            onChange={(checked) => updateSetting('showUnit', checked)}
                        />
                        <span className="text-xs text-muted dark:text-muted-dark">
                            {settings.showUnit ? '表示する' : '表示しない'}
                        </span>
                    </div>
                </div>
                <p className="text-xs text-muted dark:text-muted-dark">（項目に単位設置）</p>
            </div>

            {/* 端数処理 */}
            <div className="mb-6 space-y-4">
                <h3 className="text-lg font-semibold">端数処理</h3>
                
                <div>
                    <label htmlFor="item-rounding" className="block text-sm font-medium mb-1">明細行ごとの端数処理</label>
                    <select
                        id="item-rounding"
                        name="item-rounding"
                        value={settings.itemRounding || 'round'}
                        onChange={e => updateSetting('itemRounding', e.target.value as 'floor' | 'ceil' | 'round')}
                        className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                    >
                        <option value="floor">切り捨て</option>
                        <option value="ceil">切り上げ</option>
                        <option value="round">四捨五入</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="tax-rounding" className="block text-sm font-medium mb-1">消費税の端数処理</label>
                    <select
                        id="tax-rounding"
                        name="tax-rounding"
                        value={settings.taxRounding || 'round'}
                        onChange={e => updateSetting('taxRounding', e.target.value as 'floor' | 'ceil' | 'round')}
                        className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                    >
                        <option value="floor">切り捨て</option>
                        <option value="ceil">切り上げ</option>
                        <option value="round">四捨五入</option>
                    </select>
                </div>
            </div>

            {/* 消費税 */}
            <div className="mb-6 space-y-4">
                <h3 className="text-lg font-semibold">消費税</h3>
                
                <div>
                    <label htmlFor="tax-display-mode" className="block text-sm font-medium mb-1">消費税の表示方式</label>
                    <select
                        id="tax-display-mode"
                        name="tax-display-mode"
                        value={settings.taxDisplayMode || 'exclusive'}
                        onChange={e => updateSetting('taxDisplayMode', e.target.value as 'exclusive' | 'inclusive')}
                        className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                    >
                        <option value="exclusive">外税</option>
                        <option value="inclusive">内税</option>
                    </select>
                    <p className="text-xs text-muted dark:text-muted-dark mt-1">
                        ※ 内税は商品の単価計算等で小数点以下が発生する可能性ありなので設定はありますがロジックは未実装でデフォルトは外税でのちほどどうするか決定
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <label htmlFor="doc-settings-show-tax-when-zero" className="text-sm font-medium">消費税が0円の場合</label>
                    <div className="flex items-center gap-2">
                        <ToggleSwitch
                            id="doc-settings-show-tax-when-zero"
                            name="show-tax-when-zero"
                            checked={settings.showTaxWhenZero ?? true}
                            onChange={(checked) => updateSetting('showTaxWhenZero', checked)}
                        />
                        <span className="text-xs text-muted dark:text-muted-dark">
                            {settings.showTaxWhenZero ? '消費税欄を表示する' : '消費税欄を非表示'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label htmlFor="doc-settings-show-tax-free-breakdown" className="text-sm font-medium">課税対象外の内訳欄表示</label>
                    <div className="flex items-center gap-2">
                        <ToggleSwitch
                            id="doc-settings-show-tax-free-breakdown"
                            name="show-tax-free-breakdown"
                            checked={settings.showTaxFreeBreakdown ?? false}
                            onChange={(checked) => updateSetting('showTaxFreeBreakdown', checked)}
                        />
                        <span className="text-xs text-muted dark:text-muted-dark">
                            {settings.showTaxFreeBreakdown ? '表示する' : '表示しない'}
                        </span>
                    </div>
                </div>
                <p className="text-xs text-muted dark:text-muted-dark">
                    ※ 設定設置だが内容のほうで設定がまだありませんのでロジックなどは未実装のまま仕様上は特に何も変更なし
                </p>
            </div>

            {/* 既存の請求書設定（後方互換性） */}
            {documentType === 'invoice' && (
                <div className="space-y-4 mb-6">
                    <div>
                        <label htmlFor="invoice-payment-method" className="block text-sm font-medium mb-1">支払方法</label>
                        <select
                            id="invoice-payment-method"
                            name="invoice-payment-method"
                            value={settings.paymentMethod || ''}
                            onChange={e => updateSetting('paymentMethod', e.target.value)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">支払方法を選択してください</option>
                            {paymentMethods.map(method => (
                                <option key={method.id as string} value={method.name as string}>
                                    {method.name}
                                </option>
                            ))}
                        </select>
                        {paymentMethods.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">※ 支払方法は商品定義管理で設定できます</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="invoice-payment-due-date" className="block text-sm font-medium mb-1">支払期限</label>
                        <input
                            id="invoice-payment-due-date"
                            name="invoice-payment-due-date"
                            type="date"
                            value={settings.paymentDueDate || ''}
                            onChange={e => updateSetting('paymentDueDate', e.target.value)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            )}

            {/* 領収書設定 */}
            {documentType === 'receipt' && (
                <div className="space-y-4 mb-6">
                    <div>
                        <label htmlFor="receipt-notes" className="block text-sm font-medium mb-1">但し書き</label>
                        <input
                            id="receipt-notes"
                            name="receipt-notes"
                            type="text"
                            value={settings.notes || ''}
                            onChange={e => updateSetting('notes', e.target.value)}
                            placeholder="例: お品代として"
                            className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            )}

            {/* 設定保存の注意書き */}
            <div className="mt-6 pt-4 border-t border-base-200 dark:border-base-dark-300">
                <p className="text-xs text-muted dark:text-muted-dark">
                    ※ サービス全体の設定は「帳票設定」から編集できます
                </p>
            </div>
        </div>
    );
};

export default DocumentSettingsSection;
