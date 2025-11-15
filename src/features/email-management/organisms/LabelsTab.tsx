import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { Database, Row } from '@shared/types';
import { Button, PencilIcon, PlusIcon, TrashIcon, Input, Select } from '@components/atoms';
import { SettingsCard } from '@components/molecules';

interface LabelsTabProps {
    database: Database;
    setDatabase: (updater: (db: Database | null) => Database | null) => void;
    setHasChanges: (hasChanges: boolean) => void;
    isDefaultMode: boolean;
}

const LabelsTab: React.FC<LabelsTabProps> = ({ database, setDatabase, setHasChanges, isDefaultMode }) => {
    const { currentPage } = useNavigation();
    const initialLabels = useMemo(() => database.email_labels?.data || [], [database.email_labels]);
    const initialRules = useMemo(() => database.email_label_ai_rules?.data || [], [database.email_label_ai_rules]);

    const [labels, setLabels] = useState<Row[]>(initialLabels);
    const [rules, setRules] = useState<Row[]>(initialRules);
    
    const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [newLabelName, setNewLabelName] = useState('');

    useEffect(() => {
        setLabels(initialLabels);
        setRules(initialRules);
    }, [initialLabels, initialRules]);
    
    const hasChanges = useMemo(() => {
        return JSON.stringify(labels) !== JSON.stringify(initialLabels) || JSON.stringify(rules) !== JSON.stringify(initialRules);
    }, [labels, rules, initialLabels, initialRules]);

    useEffect(() => {
        setHasChanges(hasChanges);
    }, [hasChanges, setHasChanges]);

    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            newDb.email_labels.data = labels;
            newDb.email_label_ai_rules.data = rules;
            return newDb;
        });

        // サーバーに保存（全データを置き換え）
        try {
            // email_labels
            const existingLabelIds = (database.email_labels?.data || []).map((l: Row) => l.id);
            const labelOperations = [
                ...existingLabelIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                ...labels.map(label => ({ type: 'INSERT' as const, data: label }))
            ];
            if (labelOperations.length > 0) {
                const labelResult = await updateDatabase(currentPage, 'email_labels', labelOperations, database);
                if (!labelResult.success) {
                    throw new Error(labelResult.error || 'Failed to save email labels to server');
                }
            }

            // email_label_ai_rules
            const existingRuleIds = (database.email_label_ai_rules?.data || []).map((r: Row) => r.id);
            const ruleOperations = [
                ...existingRuleIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                ...rules.map(rule => ({ type: 'INSERT' as const, data: rule }))
            ];
            if (ruleOperations.length > 0) {
                const ruleResult = await updateDatabase(currentPage, 'email_label_ai_rules', ruleOperations, database);
                if (!ruleResult.success) {
                    throw new Error(ruleResult.error || 'Failed to save email label AI rules to server');
                }
            }

            alert('設定を保存しました。');
        } catch (error) {
            console.error('[LabelsTab] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleAddLabel = () => {
        if (!newLabelName.trim()) return;
        const newLabel = { id: `label_${Date.now()}`, name: newLabelName.trim(), color: '#cccccc' };
        setLabels(prev => [...prev, newLabel]);
        setNewLabelName('');
    };

    const handleUpdateLabel = (id: string, updates: Partial<Row>) => {
        setLabels(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
        if (editingLabelId === id && updates.name !== undefined) { 
            setEditingLabelId(null);
        }
    };

    const handleDeleteLabel = (id: string) => {
        if (window.confirm('このラベルを削除しますか？関連する振り分けルールも全て削除されます。')) {
            setLabels(prev => prev.filter(l => l.id !== id));
            setRules(prev => prev.filter(r => r.label_id !== id));
            if (selectedLabelId === id) setSelectedLabelId(null);
        }
    };

    const handleAddRule = () => {
        if (!selectedLabelId) return;
        const newRule = { id: `rule_${Date.now()}`, label_id: selectedLabelId, condition_type: 'subject_contains', condition_value: '', sort_order: (rules.filter(r => r.label_id === selectedLabelId).length + 1) * 10 };
        setRules(prev => [...prev, newRule]);
    };
    
    const handleUpdateRule = (id: string, updates: Partial<Row>) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const handleDeleteRule = (id: string) => {
        setRules(prev => prev.filter(r => r.id !== id));
    };

    const selectedLabel = useMemo(() => labels.find(l => l.id === selectedLabelId), [labels, selectedLabelId]);

    return (
        <div className="space-y-6">
            <div className="flex justify-end sticky top-0 py-2 bg-container-bg dark:bg-container-bg-dark z-10">
                <Button onClick={handleSave} disabled={!hasChanges || !isDefaultMode}>保存</Button>
            </div>
            {!isDefaultMode ? (
                <div className="text-center text-muted dark:text-muted-dark p-8 bg-container-muted-bg rounded-md">
                    ラベルは全アカウント共通の設定です。編集するには、アカウントセレクターで「デフォルト（共通）設定」を選択してください。
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SettingsCard title="ラベル管理">
                        <div className="space-y-2">
                            {labels.map(label => (
                                <div key={label.id} className={`p-2 rounded flex items-center gap-2 ${selectedLabelId === label.id ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`} onClick={() => setSelectedLabelId(label.id)}>
                                    <input id={`label-color-${label.id}`} type="color" value={label.color} onChange={e => handleUpdateLabel(label.id, { color: e.target.value })} className="w-6 h-6 p-0 border-none rounded bg-transparent"/>
                                    {editingLabelId === label.id ? (
                                        <Input id={`label-name-input-${label.id}`} name={`label_name_${label.id}`} value={label.name} onChange={e => handleUpdateLabel(label.id, { name: e.target.value })} onBlur={() => setEditingLabelId(null)} autoFocus />
                                    ) : (
                                        <span className="flex-grow">{label.name}</span>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => setEditingLabelId(label.id)}><PencilIcon className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLabel(label.id)}><TrashIcon className="w-4 h-4"/></Button>
                                </div>
                            ))}
                        </div>
                         <div className="flex gap-2 mt-4">
                            <Input id="new-label-name-input" name="new_label_name" value={newLabelName} onChange={e => setNewLabelName(e.target.value)} placeholder="新しいラベル名" />
                            <Button onClick={handleAddLabel}><PlusIcon className="w-4 h-4 mr-1"/>追加</Button>
                        </div>
                    </SettingsCard>

                    <SettingsCard title={selectedLabel ? `「${selectedLabel.name}」のAI振り分けルール` : 'AI振り分けルール'}>
                        {selectedLabel ? (
                            <div className="space-y-2">
                                {rules.filter(r => r.label_id === selectedLabelId).map(rule => (
                                    <div key={rule.id} className="flex items-center gap-2 text-sm p-1">
                                        <Select value={rule.condition_type} onChange={e => handleUpdateRule(rule.id, { condition_type: e.target.value })} className="w-32 h-8">
                                            <option value="subject_contains">件名</option>
                                            <option value="from_address_contains">差出人</option>
                                            <option value="body_contains">本文</option>
                                        </Select>
                                        <span>が</span>
                                        <Input name={`rule-condition-value-${rule.id}`} value={rule.condition_value} onChange={e => handleUpdateRule(rule.id, { condition_value: e.target.value })} className="flex-grow h-8" placeholder="キーワード"/>
                                        <span>を含む</span>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}><TrashIcon className="w-4 h-4"/></Button>
                                    </div>
                                ))}
                                 <Button variant="secondary" size="sm" onClick={handleAddRule} className="mt-2"><PlusIcon className="w-4 h-4 mr-1"/>ルールを追加</Button>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center p-8">左のリストからラベルを選択して、振り分けルールを設定してください。</p>
                        )}
                    </SettingsCard>
                </div>
            )}
        </div>
    );
};

export default LabelsTab;