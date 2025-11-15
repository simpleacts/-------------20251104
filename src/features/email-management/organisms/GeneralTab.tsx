import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { Database, Row } from '@shared/types';
import { Button, Label, RadioGroup, RadioGroupItem, RadioGroupItemWrapper, Select, Textarea } from '@components/atoms';
import { SettingsCard } from '@components/molecules';
import { EmailAccount } from '../types';

interface GeneralTabProps {
    database: Database;
    setDatabase: (updater: (db: Database | null) => Database | null) => void;
    setHasChanges: (hasChanges: boolean) => void;
    selectedAccountId: string;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ database, setDatabase, setHasChanges, selectedAccountId }) => {
    const { currentPage } = useNavigation();
    const isDefaultMode = selectedAccountId === 'default';

    const initialSettings = useMemo(() => {
        const settingsData = database.email_settings?.data || [];
        return settingsData.reduce((acc, s) => {
            acc[s.key as string] = s.value;
            return acc;
        }, {} as Record<string, any>);
    }, [database.email_settings]);

    const initialAccountSettings = useMemo(() => {
        if (isDefaultMode) return {};
        const account = (database.email_accounts?.data as EmailAccount[] || []).find(acc => acc.id === selectedAccountId);
        return account ? { signature: account.signature } : {};
    }, [database.email_accounts, selectedAccountId, isDefaultMode]);


    const [settings, setSettings] = useState(initialSettings);
    const [accountSettings, setAccountSettings] = useState(initialAccountSettings);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    useEffect(() => {
        setAccountSettings(initialAccountSettings);
    }, [initialAccountSettings]);


    const hasChanges = useMemo(() => 
        JSON.stringify(settings) !== JSON.stringify(initialSettings) ||
        JSON.stringify(accountSettings) !== JSON.stringify(initialAccountSettings), 
    [settings, accountSettings, initialSettings, initialAccountSettings]);

    useEffect(() => {
        setHasChanges(hasChanges);
    }, [hasChanges, setHasChanges]);

    const handleCommonSettingChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleAccountSettingChange = (key: keyof EmailAccount, value: any) => {
        setAccountSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            const commonSettingsTable = newDb.email_settings.data;
            Object.entries(settings).forEach(([key, value]) => {
                const settingIndex = commonSettingsTable.findIndex((s: Row) => s.key === key);
                if (settingIndex > -1) {
                    if (String(value) !== String(initialSettings[key])) {
                         commonSettingsTable[settingIndex].value = String(value);
                    }
                } else {
                    commonSettingsTable.push({ key, value: String(value) });
                }
            });

            if (!isDefaultMode) {
                const accountIndex = newDb.email_accounts.data.findIndex((acc: Row) => acc.id === selectedAccountId);
                if (accountIndex > -1) {
                    newDb.email_accounts.data[accountIndex] = {
                        ...newDb.email_accounts.data[accountIndex],
                        ...accountSettings,
                    };
                }
            }
            return newDb;
        });

        // サーバーに保存
        try {
            // email_settings
            const settingsOperations: any[] = [];
            Object.entries(settings).forEach(([key, value]) => {
                if (String(value) !== String(initialSettings[key])) {
                    const existing = (database.email_settings?.data || []).find((s: Row) => s.key === key);
                    if (existing) {
                        settingsOperations.push({
                            type: 'UPDATE' as const,
                            data: { value: String(value) },
                            where: { key }
                        });
                    } else {
                        settingsOperations.push({
                            type: 'INSERT' as const,
                            data: { key, value: String(value) }
                        });
                    }
                }
            });

            if (settingsOperations.length > 0) {
                const settingsResult = await updateDatabase(currentPage, 'email_settings', settingsOperations, database);
                if (!settingsResult.success) {
                    throw new Error(settingsResult.error || 'Failed to save email settings to server');
                }
            }

            // email_accounts (アカウント固有の設定)
            if (!isDefaultMode) {
                const accountOperations = [{
                    type: 'UPDATE' as const,
                    data: accountSettings,
                    where: { id: selectedAccountId }
                }];
                const accountResult = await updateDatabase(currentPage, 'email_accounts', accountOperations, database);
                if (!accountResult.success) {
                    throw new Error(accountResult.error || 'Failed to save email account settings to server');
                }
            }

            alert('設定を保存しました。');
        } catch (error) {
            console.error('[GeneralTab] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-end sticky top-0 py-2 bg-container-bg dark:bg-container-bg-dark z-10">
                <Button onClick={handleSave} disabled={!hasChanges}>保存</Button>
            </div>
            <SettingsCard title="表示設定 (共通)">
                <fieldset disabled={!isDefaultMode} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>表示言語</Label><Select value={settings.display_language || 'ja'} onChange={e => handleCommonSettingChange('display_language', e.target.value)}><option value="ja">日本語</option><option value="en">English</option></Select></div>
                        <div><Label>1ページあたりの表示件数</Label><Select value={settings.page_size || '50'} onChange={e => handleCommonSettingChange('page_size', e.target.value)}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></Select></div>
                    </div>
                </fieldset>
                {!isDefaultMode && <p className="text-xs text-muted dark:text-muted-dark mt-2 p-2 bg-container-muted-bg rounded-md">共通設定を編集するには、アカウントセレクターで「デフォルト（共通）設定」を選択してください。</p>}
            </SettingsCard>
            <SettingsCard title="送信設定">
                <fieldset disabled={!isDefaultMode} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>送信取り消し可能時間</Label><Select value={settings.undo_send_period || '5'} onChange={e => handleCommonSettingChange('undo_send_period', e.target.value)}><option value="5">5秒</option><option value="10">10秒</option><option value="20">20秒</option><option value="30">30秒</option></Select></div>
                        <div>
                            <Label>返信時のデフォルトの動作</Label>
                            <RadioGroup onValueChange={(value) => handleCommonSettingChange('default_reply_behavior', value)} value={settings.default_reply_behavior || 'reply'} name="default_reply_behavior" className="flex gap-4 pt-2">
                                <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="reply"><RadioGroupItem id="r1"/></RadioGroupItemWrapper><Label htmlFor="r1">返信</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="reply_all"><RadioGroupItem id="r2"/></RadioGroupItemWrapper><Label htmlFor="r2">全員に返信</Label></div>
                            </RadioGroup>
                        </div>
                    </div>
                </fieldset>
                 {!isDefaultMode && <p className="text-xs text-muted dark:text-muted-dark mt-2 p-2 bg-container-muted-bg rounded-md">共通設定を編集するには、アカウントセレクターで「デフォルト（共通）設定」を選択してください。</p>}
            </SettingsCard>

             <SettingsCard title="署名 (アカウント別)">
                <fieldset disabled={isDefaultMode} className="space-y-2">
                    <Textarea 
                        value={accountSettings.signature || ''} 
                        onChange={e => handleAccountSettingChange('signature', e.target.value)} 
                        rows={4} 
                        placeholder="--&#10;名前&#10;会社名"
                        className="font-mono text-xs"
                    />
                </fieldset>
                {isDefaultMode && <p className="text-xs text-muted dark:text-muted-dark mt-2 p-2 bg-container-muted-bg rounded-md">署名を編集するには、個別のアカウントを選択してください。</p>}
            </SettingsCard>
        </div>
    );
};

export default GeneralTab;