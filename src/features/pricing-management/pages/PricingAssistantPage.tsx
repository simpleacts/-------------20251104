import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Column, Database, Row } from '@shared/types';
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@components/atoms';
import BasicPricingSettingsModal from '../modals/BasicPricingSettingsModal';
import { fetchTables } from '@core/data/db.live';

interface PricingAssistantProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const PricingWizardModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    database: Database;
    onSave: (operations: { tableName: string; data: Row }[]) => void;
}> = ({ isOpen, onClose, database, onSave }) => {
    const { t } = useTranslation('pricing-management');
    const [step, setStep] = useState(1);
    const [ruleType, setRuleType] = useState<'product_price' | 'print_price' | null>(null);
    const [customerGroupId, setCustomerGroupId] = useState<string>('all');
    const [targetType, setTargetType] = useState<'manufacturer' | 'category' | null>(null);
    const [targetId, setTargetId] = useState<string>('');
    const [pricingModel, setPricingModel] = useState<'RATE' | 'MARKUP' | null>(null);
    const [rate, setRate] = useState<number>(0.5);
    const [markup, setMarkup] = useState<number>(0.3);
    const [printScheduleId, setPrintScheduleId] = useState<string>('');

    if (!isOpen) return null;

    const resetWizard = () => {
        setStep(1); setRuleType(null); setCustomerGroupId('all'); setTargetType(null);
        setTargetId(''); setPricingModel(null); setRate(0.5); setMarkup(0.3); setPrintScheduleId('');
    };

    const handleClose = () => { resetWizard(); onClose(); };

    const handleSave = () => {
        const operations: { tableName: string; data: Row }[] = [];
        if (ruleType === 'product_price' && targetType && targetId && pricingModel) {
            const targetName = targetType === 'manufacturer' ? (database.manufacturers?.data || []).find(m => m.id === targetId)?.name : (database.categories?.data || []).find(c => c.categoryId === targetId)?.categoryName;
            const modelLabel = pricingModel === 'RATE' ? t('pricing.assistant.model_rate', '定価掛率') : t('pricing.assistant.model_markup', '仕入値マークアップ');
            const ruleName = (t('pricing.assistant.for_target', '{target}向け - {model}') || '{target}向け - {model}').replace('{target}', targetName || '').replace('{model}', modelLabel);
            const newRule: Row = {
                id: `prul_${Date.now()}`, name: ruleName, pricing_model: pricingModel,
                rate: pricingModel === 'RATE' ? rate : null,
                markup_percentage: pricingModel === 'MARKUP' ? markup : null,
                volume_discount_schedule_id: null,
            };
            operations.push({ tableName: 'pricing_rules', data: newRule });

            const newAssignment: Row = {
                id: `pasn_${Date.now()}`, target_type: targetType, target_id: targetId,
                rule_id: newRule.id, customer_group_id: customerGroupId
            };
            operations.push({ tableName: 'pricing_assignments', data: newAssignment });

        } else if (ruleType === 'print_price' && targetType === 'category' && targetId && printScheduleId) {
            const newScheduleAssignment: Row = {
                category_id: targetId,
                schedule_id: printScheduleId,
                customer_group_id: customerGroupId === 'all' ? '1' : customerGroupId,
            };
             operations.push({ tableName: 'category_pricing_schedules', data: newScheduleAssignment });
        }
        
        if (operations.length > 0) {
            onSave(operations);
        }
        handleClose();
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3 className="font-semibold mb-3">{t('pricing.assistant.step1_question', '1. 何の価格を設定しますか？')}</h3>
                        <div className="space-y-2">
                            <button onClick={() => { setRuleType('product_price'); setStep(2); }} className="w-full text-left p-3 border border-default rounded-md hover:bg-gray-100">{t('pricing.assistant.product_price', '商品の販売単価')}</button>
                            <button onClick={() => { setRuleType('print_price'); setTargetType('category'); setStep(2); }} className="w-full text-left p-3 border border-default rounded-md hover:bg-gray-100">{t('pricing.assistant.print_price', 'プリント代の単価表')}</button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h3 className="font-semibold mb-3">{t('pricing.assistant.step2_customer', '2. どの顧客グループに適用しますか？')}</h3>
                        <select value={customerGroupId} onChange={e => setCustomerGroupId(e.target.value)} className="w-full p-2 border border-default rounded-md">
                            <option value="all">{t('pricing.assistant.all_customers', 'すべての顧客 (一般)')}</option>
                            {(database.customer_groups?.data || []).map(g => <option key={g.id as string} value={g.id as string}>{g.name as string}</option>)}
                        </select>
                        <button onClick={() => setStep(3)} className="mt-4 w-full p-2 bg-blue-600 text-white rounded-md">{t('pricing.assistant.next', '次へ')}</button>
                    </div>
                );
            case 3:
                 if (ruleType === 'print_price') {
                    return (
                        <div>
                            <h3 className="font-semibold mb-3">{t('pricing.assistant.step3_category', '3. どの商品カテゴリーに適用しますか？')}</h3>
                            <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full p-2 border border-default rounded-md">
                                <option value="">{t('pricing.assistant.select_category', 'カテゴリーを選択...')}</option>
                                {(database.categories?.data || []).map(c => <option key={c.categoryId as string} value={c.categoryId as string}>{c.categoryName as string}</option>)}
                            </select>
                            <button onClick={() => setStep(4)} disabled={!targetId} className="mt-4 w-full p-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400">{t('pricing.assistant.next', '次へ')}</button>
                        </div>
                    )
                 }
                return (
                    <div>
                        <h3 className="font-semibold mb-3">{t('pricing.assistant.step3_product_group', '3. どの商品群に適用しますか？')}</h3>
                        <select value={targetType || ''} onChange={e => setTargetType(e.target.value as any)} className="w-full p-2 border border-default rounded-md mb-2">
                            <option value="">{t('pricing.assistant.select_type', '対象の種別を選択...')}</option>
                            <option value="manufacturer">{t('pricing.assistant.manufacturer', 'メーカー')}</option>
                            <option value="category">{t('pricing.assistant.category', 'カテゴリー')}</option>
                        </select>
                        {targetType && (
                            <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full p-2 border border-default rounded-md">
                                <option value="">{targetType === 'manufacturer' ? t('pricing.assistant.select_manufacturer', 'メーカーを選択...') : t('pricing.assistant.select_category_option', 'カテゴリーを選択...')}</option>
                                {/* FIX: Cast `item` to any to allow accessing properties that may not exist on all union members. */}
                                {(targetType === 'manufacturer' ? (database.manufacturers?.data || []) : (database.categories?.data || [])).map((item: Row) => (
                                    <option key={(item as any).id || (item as any).categoryId} value={(item as any).id || (item as any).categoryId}>{(item as any).name || (item as any).categoryName}</option>
                                ))}
                            </select>
                        )}
                        <button onClick={() => setStep(4)} disabled={!targetId} className="mt-4 w-full p-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400">次へ</button>
                    </div>
                );
            case 4:
                if (ruleType === 'product_price') {
                    return (
                        <div>
                            <h3 className="font-semibold mb-3">{t('pricing.assistant.step4_method', '4. 価格計算の方法は？')}</h3>
                            <div className="space-y-2">
                                <button onClick={() => { setPricingModel('RATE'); setStep(5); }} className="w-full text-left p-3 border border-default rounded-md hover:bg-gray-100">{t('pricing.assistant.method_rate', '定価からの掛率で計算')}</button>
                                <button onClick={() => { setPricingModel('MARKUP'); setStep(5); }} className="w-full text-left p-3 border border-default rounded-md hover:bg-gray-100">{t('pricing.assistant.method_markup', '仕入値からのマークアップ率で計算')}</button>
                            </div>
                        </div>
                    );
                }
                 if (ruleType === 'print_price') {
                    return (
                        <div>
                            <h3 className="font-semibold mb-3">{t('pricing.assistant.step4_print_schedule', '4. どのプリント単価表を適用しますか？')}</h3>
                            <select value={printScheduleId} onChange={e => setPrintScheduleId(e.target.value)} className="w-full p-2 border border-default rounded-md">
                                <option value="">{t('pricing.assistant.select_print_schedule', 'プリント単価表を選択...')}</option>
                                {(database.print_pricing_schedules?.data || []).map(s => <option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
                            </select>
                             <button onClick={handleSave} disabled={!printScheduleId} className="mt-4 w-full p-2 bg-green-600 text-white rounded-md disabled:bg-gray-400">{t('pricing.assistant.save_rule', 'ルールを保存')}</button>
                        </div>
                    );
                }
                return null;
            case 5:
                return (
                    <div>
                        <h3 className="font-semibold mb-3">{t('pricing.assistant.step5_input', '5. 具体的な数値を入力してください')}</h3>
                        {pricingModel === 'RATE' && <div><label>{t('pricing.assistant.rate_label', '掛率 (例: 0.52)')}</label><input type="number" step="0.01" value={rate} onChange={e => setRate(parseFloat(e.target.value))} className="w-full p-2 border border-default rounded-md" /></div>}
                        {pricingModel === 'MARKUP' && <div><label>{t('pricing.assistant.markup_label', 'マークアップ率 (例: 0.3 = 30%増)')}</label><input type="number" step="0.01" value={markup} onChange={e => setMarkup(parseFloat(e.target.value))} className="w-full p-2 border border-default rounded-md" /></div>}
                        <button onClick={handleSave} className="mt-4 w-full p-2 bg-green-600 text-white rounded-md">{t('pricing.assistant.save_rule', 'ルールを保存')}</button>
                    </div>
                )
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={handleClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">{t('pricing.assistant.wizard_title', '価格設定ウィザード')}</h2>
                    <button onClick={handleClose}><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6">{renderStepContent()}</main>
            </div>
        </div>
    );
};


const PricingAssistant: React.FC<PricingAssistantProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('pricing-management');
    const { currentPage } = useNavigation();
    const [activeTab, setActiveTab] = useState<'rules' | 'basic'>('rules');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingSettingsInfo, setEditingSettingsInfo] = useState<{tableName: string, displayName: string, schema: Column[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loadedTablesRef = useRef<Set<string>>(new Set());

    // データ読み込み処理
    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            
            const requiredTables = [
                'category_pricing_schedules',
                'customer_groups',
                'manufacturers',
                'categories',
                'pricing_rules',
                'print_pricing_schedules',
                'pricing_assignments',
                // 基本料金設定で使用するテーブル
                'plate_costs',
                'special_ink_costs',
                'additional_print_costs_by_size',
                'additional_print_costs_by_location',
                'additional_print_costs_by_tag',
                'shipping_costs',
                'tags'
            ];
            
            // 既に読み込み済みのテーブルはスキップ
            const missingTables = requiredTables.filter(t => {
                if (loadedTablesRef.current.has(t)) return false;
                if (database[t]) {
                    loadedTablesRef.current.add(t);
                    return false;
                }
                return true;
            });
            
            if (missingTables.length === 0) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            try {
                missingTables.forEach(t => loadedTablesRef.current.add(t));
                const data = await fetchTables(missingTables, { toolName: 'pricing-assistant' });
                setDatabase(prev => ({...(prev || {}), ...data}));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []); // 初回のみ実行

    const { customerGroupsMap, manufacturersMap, categoriesMap, rulesMap, schedulesMap } = useMemo(() => {
        return {
            customerGroupsMap: new Map((database.customer_groups?.data || []).map(g => [g.id, g.name])),
            manufacturersMap: new Map((database.manufacturers?.data || []).map(m => [m.id, m.name])),
            categoriesMap: new Map((database.categories?.data || []).map(c => [c.categoryId, c.categoryName])),
            rulesMap: new Map((database.pricing_rules?.data || []).map(r => [r.id, r])),
            schedulesMap: new Map((database.print_pricing_schedules?.data || []).map(s => [s.id, s.name]))
        };
    }, [database]);

    const productPriceRules = useMemo(() => {
        return (database.pricing_assignments?.data || []).map(assignment => {
            const rule = rulesMap.get(assignment.rule_id);
            if (!rule) return null;
            const targetName = assignment.target_type === 'manufacturer'
                ? manufacturersMap.get(assignment.target_id)
                : categoriesMap.get(assignment.target_id);
            const customerGroup = customerGroupsMap.get(assignment.customer_group_id) || t('pricing.assistant.all_customers', 'すべての顧客 (一般)');
            const targetTypeLabel = assignment.target_type === 'manufacturer' 
                ? t('pricing.assistant.manufacturer', 'メーカー') 
                : t('pricing.assistant.category', 'カテゴリー');
            return { id: assignment.id, customerGroup, target: `${targetTypeLabel}: ${targetName}`, ruleName: rule.name };
        }).filter(Boolean);
    }, [database.pricing_assignments, rulesMap, manufacturersMap, categoriesMap, customerGroupsMap, t]);

    const printPriceRules = useMemo(() => {
        return (database.category_pricing_schedules?.data || []).map(assignment => {
             const categoryName = categoriesMap.get(assignment.category_id);
             const scheduleName = schedulesMap.get(assignment.schedule_id);
             const customerGroup = customerGroupsMap.get(assignment.customer_group_id) || t('pricing.assistant.all_customers', 'すべての顧客 (一般)');
             return { ...assignment, customerGroup, target: `${t('pricing.assistant.category', 'カテゴリー')}: ${categoryName}`, ruleName: scheduleName };
        });
    }, [database.category_pricing_schedules, categoriesMap, schedulesMap, customerGroupsMap, t]);

    const handleSaveWizard = async (operations: { tableName: string; data: Row }[]) => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            operations.forEach(op => {
                const table = newDb[op.tableName];
                if (table && table.data) {
                    table.data.push(op.data);
                }
            });
            return newDb;
        });

        // サーバーに保存
        try {
            for (const op of operations) {
                const operation = [{ type: 'INSERT' as const, data: op.data }];
                const result = await updateDatabase(currentPage, op.tableName, operation, database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to save ${op.tableName} to server`);
                }
            }
            alert('新しい価格ルールを保存しました。');
        } catch (error) {
            console.error('[PricingAssistant] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const handleDelete = async (tableName: string, rowId: any, idField = 'id') => {
        if (!window.confirm('このルールを削除しますか？')) return;
        
        // まずローカル状態から削除
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const table = newDb[tableName];
            if (table && table.data) {
                table.data = table.data.filter((row: Row) => row[idField] !== rowId);
            }
            return newDb;
        });

        // サーバーから削除
        try {
            const operation = [{ type: 'DELETE' as const, where: { [idField]: rowId } }];
            const result = await updateDatabase(currentPage, tableName, operation, database);
            if (!result.success) {
                throw new Error(result.error || `Failed to delete ${tableName} from server`);
            }
        } catch (error) {
            console.error('[PricingAssistant] Failed to delete from server:', error);
            alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleDeletePrintPriceRule = async (ruleToDelete: Row) => {
        if (!window.confirm('このルールを削除しますか？')) return;
        
        // まずローカル状態から削除
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const table = newDb.category_pricing_schedules;
            if (table && table.data) {
                table.data = table.data.filter((row: Row) => 
                    !(row.category_id === ruleToDelete.category_id && 
                      row.schedule_id === ruleToDelete.schedule_id && 
                      row.customer_group_id === ruleToDelete.customer_group_id)
                );
            }
            return newDb;
        });

        // サーバーから削除
        try {
            const operation = [{
                type: 'DELETE' as const,
                where: {
                    category_id: ruleToDelete.category_id,
                    schedule_id: ruleToDelete.schedule_id,
                    customer_group_id: ruleToDelete.customer_group_id
                }
            }];
            const result = await updateDatabase(currentPage, 'category_pricing_schedules', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete print price rule from server');
            }
        } catch (error) {
            console.error('[PricingAssistant] Failed to delete from server:', error);
            alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const handleOpenSettingsModal = (tableName: string, displayName: string) => {
        const table = database[tableName];
        if (!table) {
            console.error(`Table ${tableName} not found in database`);
            return;
        }
        setEditingSettingsInfo({ tableName, displayName, schema: table.schema });
        setIsSettingsModalOpen(true);
    };

    const handleSaveSettings = async (tableName: string, updatedData: Row[]) => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const table = newDb[tableName];
            if (table) {
                table.data = updatedData;
            }
            return newDb;
        });

        // サーバーに保存（全データを置き換え）
        try {
            const table = database[tableName];
            if (!table) {
                throw new Error(`Table ${tableName} not found in database`);
            }
            const existingIds = (table.data || []).map((r: Row) => {
                const pk = table.schema[0]?.name || 'id';
                return r[pk];
            });
            const operations = [
                ...existingIds.map(id => {
                    const pk = table.schema[0]?.name || 'id';
                    return { type: 'DELETE' as const, where: { [pk]: id } };
                }),
                ...updatedData.map(item => ({ type: 'INSERT' as const, data: item }))
            ];

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, tableName, operations, database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to save ${tableName} to server`);
                }
            }
            setIsSettingsModalOpen(false);
            alert(`「${editingSettingsInfo?.displayName}」を更新しました。`);
        } catch (error) {
            console.error('[PricingAssistant] Failed to save settings to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const SettingsCard: React.FC<{title: string, tableName: string, children: React.ReactNode}> = ({ title, tableName, children }) => (
        <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={() => handleOpenSettingsModal(tableName, title)} className="p-2 text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5"/></button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{children}</div>
        </div>
    );
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">データを読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">エラーが発生しました</p>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }
    
    return (
        <>
            <div className="flex flex-col h-full">
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">{t('pricing.assistant.title', '価格設定アシスタント')}</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('pricing.assistant.description', 'ウィザード形式で、複雑な価格設定ルールを簡単に追加・管理します。')}</p>
                    </div>
                </header>

                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('rules')}
                            className={`${activeTab === 'rules' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                            {t('pricing.assistant.tab_rules', '価格ルール')}
                        </button>
                        <button
                            onClick={() => setActiveTab('basic')}
                            className={`${activeTab === 'basic' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                            {t('pricing.assistant.tab_basic', '基本料金設定')}
                        </button>
                    </nav>
                </div>
                
                {activeTab === 'rules' && (
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{t('pricing.assistant.product_price_rules', '商品価格ルール')}</h2>
                                <button onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg">
                                    <PlusIcon className="w-5 h-5"/> {t('pricing.assistant.add_rule', '新規ルールを追加')}
                                </button>
                            </div>
                            <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left">{t('pricing.assistant.customer_group', '顧客グループ')}</th>
                                            <th className="p-2 text-left">{t('pricing.assistant.target', '対象')}</th>
                                            <th className="p-2 text-left">{t('pricing.assistant.rule_name', 'ルール名')}</th>
                                            <th className="p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productPriceRules.map(rule => (
                                            <tr key={rule.id as string} className="border-t">
                                                <td className="p-2">{rule.customerGroup as string}</td>
                                                <td className="p-2">{rule.target as string}</td>
                                                <td className="p-2">{rule.ruleName as string}</td>
                                                <td className="p-2 text-right">
                                                    <button onClick={() => handleDelete('pricing_assignments', rule.id)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-4">{t('pricing.assistant.print_price_rules', 'プリント単価ルール')}</h2>
                            <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                                <table className="min-w-full text-sm">
                                     <thead>
                                        <tr>
                                            <th className="p-2 text-left">{t('pricing.assistant.customer_group', '顧客グループ')}</th>
                                            <th className="p-2 text-left">{t('pricing.assistant.target', '対象')}</th>
                                            <th className="p-2 text-left">{t('pricing.assistant.applied_schedule', '適用単価表')}</th>
                                            <th className="p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printPriceRules.map((rule, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="p-2">{rule.customerGroup as string}</td>
                                                <td className="p-2">{rule.target as string}</td>
                                                <td className="p-2">{rule.ruleName as string}</td>
                                                <td className="p-2 text-right">
                                                    <button onClick={() => handleDeletePrintPriceRule(rule)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingsCard title={t('pricing.assistant.plate_cost_title', '製版代')} tableName="plate_costs">
                            {t('pricing.assistant.plate_cost_desc', '製版サイズごとの基本料金と、色数ごとの追加料金を設定します。')}
                        </SettingsCard>
                        <SettingsCard title={t('pricing.assistant.special_ink_title', '特殊インク')} tableName="special_ink_costs">
                            {t('pricing.assistant.special_ink_desc', '特殊インクを使用した場合の追加料金をインクごとに設定します。')}
                        </SettingsCard>
                        <SettingsCard title={t('pricing.assistant.size_cost_title', 'サイズ別追加料金')} tableName="additional_print_costs_by_size">
                            {t('pricing.assistant.size_cost_desc', '大判サイズ（30x40, 35x50）のプリントに対する追加料金を設定します。')}
                        </SettingsCard>
                        <SettingsCard title={t('pricing.assistant.location_cost_title', '箇所別追加料金')} tableName="additional_print_costs_by_location">
                            {t('pricing.assistant.location_cost_desc', 'プリントが難しい箇所（袖、裾など）への印刷に対する追加料金を設定します。')}
                        </SettingsCard>
                         <SettingsCard title={t('pricing.assistant.tag_cost_title', '素材・特性別追加料金')} tableName="additional_print_costs_by_tag">
                            {t('pricing.assistant.tag_cost_desc', '特別な処理が必要な素材（ドライTシャツ、ブルゾンなど）への印刷に対する追加料金を設定します。商品はタグで管理されます。')}
                        </SettingsCard>
                        <SettingsCard title={t('pricing.assistant.shipping_cost_title', '送料')} tableName="shipping_costs">
                            {t('pricing.assistant.shipping_cost_desc', '配送地域ごとの送料を設定します。')}
                        </SettingsCard>
                    </div>
                )}
            </div>

            {isWizardOpen && <PricingWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} database={database} onSave={handleSaveWizard} />}
            {isSettingsModalOpen && editingSettingsInfo && (
                <BasicPricingSettingsModal 
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    onSave={handleSaveSettings}
                    tableName={editingSettingsInfo.tableName}
                    displayName={editingSettingsInfo.displayName}
                    schema={editingSettingsInfo.schema}
                    initialData={database[editingSettingsInfo.tableName]?.data || []}
                />
            )}
        </>
    );
};

export default PricingAssistant;