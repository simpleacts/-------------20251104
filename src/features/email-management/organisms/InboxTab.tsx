import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { Database, Row } from '@shared/types';
import { Button, Label, RadioGroup, RadioGroupItem, RadioGroupItemWrapper } from '@components/atoms';
import { SettingsCard } from '@components/molecules';

interface InboxTabProps {
    database: Database;
    setDatabase: (updater: (db: Database | null) => Database | null) => void;
    setHasChanges: (hasChanges: boolean) => void;
    isDefaultMode: boolean;
}

const InboxTab: React.FC<InboxTabProps> = ({ database, setDatabase, setHasChanges, isDefaultMode }) => {
    const { currentPage } = useNavigation();
    const initialSettings = useMemo(() => {
        const settingsData = database.email_settings?.data || [];
        return settingsData.reduce((acc, s) => {
            acc[s.key as string] = s.value;
            return acc;
        }, {} as Record<string, any>);
    }, [database.email_settings]);

    const [settings, setSettings] = useState(initialSettings);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);
    
    const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);

    useEffect(() => {
        setHasChanges(hasChanges);
    }, [hasChanges, setHasChanges]);

    const handleSettingChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const settingsTable = newDb.email_settings.data;
            Object.entries(settings).forEach(([key, value]) => {
                const settingIndex = settingsTable.findIndex((s: Row) => s.key === key);
                if (settingIndex > -1) {
                    settingsTable[settingIndex].value = String(value);
                } else {
                    settingsTable.push({ key, value: String(value) });
                }
            });
            return newDb;
        });

        // サーバーに保存
        try {
            const operations: any[] = [];
            Object.entries(settings).forEach(([key, value]) => {
                const existing = (database.email_settings?.data || []).find((s: Row) => s.key === key);
                if (existing) {
                    operations.push({
                        type: 'UPDATE' as const,
                        data: { value: String(value) },
                        where: { key }
                    });
                } else {
                    operations.push({
                        type: 'INSERT' as const,
                        data: { key, value: String(value) }
                    });
                }
            });

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, 'email_settings', operations, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save inbox settings to server');
                }
            }
            alert('設定を保存しました。');
        } catch (error) {
            console.error('[InboxTab] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end sticky top-0 py-2 bg-container-bg dark:bg-container-bg-dark z-10">
                <Button onClick={handleSave} disabled={!hasChanges || !isDefaultMode}>保存</Button>
            </div>
             {!isDefaultMode ? (
                <div className="text-center text-muted dark:text-muted-dark p-8 bg-container-muted-bg rounded-md">
                    受信トレイ設定は全アカウント共通です。編集するには、アカウントセレクターで「デフォルト（共通）設定」を選択してください。
                </div>
            ) : (
                <fieldset disabled={!isDefaultMode} className="space-y-6">
                    <SettingsCard title="受信トレイの種類">
                        <RadioGroup onValueChange={v => handleSettingChange('inbox_type', v)} value={settings.inbox_type || 'default'} name="inbox_type" className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="default"><RadioGroupItem id="inbox-default"/></RadioGroupItemWrapper><Label htmlFor="inbox-default">デフォルト</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="important_first"><RadioGroupItem id="inbox-important"/></RadioGroupItemWrapper><Label htmlFor="inbox-important">重要なメールを先頭</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="unread_first"><RadioGroupItem id="inbox-unread"/></RadioGroupItemWrapper><Label htmlFor="inbox-unread">未読メールを先頭</Label></div>
                        </RadioGroup>
                    </SettingsCard>
                    <SettingsCard title="閲覧ウィンドウ">
                        <RadioGroup onValueChange={v => handleSettingChange('reading_pane', v)} value={settings.reading_pane || 'off'} name="reading_pane" className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="off"><RadioGroupItem id="pane-off"/></RadioGroupItemWrapper><Label htmlFor="pane-off">表示しない</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="right"><RadioGroupItem id="pane-right"/></RadioGroupItemWrapper><Label htmlFor="pane-right">受信トレイの右</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="bottom"><RadioGroupItem id="pane-bottom"/></RadioGroupItemWrapper><Label htmlFor="pane-bottom">受信トレイの下</Label></div>
                        </RadioGroup>
                    </SettingsCard>
                    <SettingsCard title="重要度マーカー">
                        <RadioGroup onValueChange={v => handleSettingChange('importance_markers', v)} value={settings.importance_markers || 'show'} name="importance_markers" className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="show"><RadioGroupItem id="marker-show"/></RadioGroupItemWrapper><Label htmlFor="marker-show">マーカーを表示</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="hide"><RadioGroupItem id="marker-hide"/></RadioGroupItemWrapper><Label htmlFor="marker-hide">マーカーを表示しない</Label></div>
                        </RadioGroup>
                    </SettingsCard>
                </fieldset>
            )}
        </div>
    );
};

export default InboxTab;