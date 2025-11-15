import React, { useEffect, useMemo, useState } from 'react';
import { Database, Row } from '@shared/types';
import { EmailAccount } from '../types';
import { Button, Input, Label, RadioGroup, RadioGroupItem, RadioGroupItemWrapper, Textarea, ToggleSwitch } from '@components/atoms';
import { SettingsCard } from '@components/molecules';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';

interface ForwardingPopImapTabProps {
    database: Database;
    setDatabase: (updater: (db: Database | null) => Database | null) => void;
    setHasChanges: (hasChanges: boolean) => void;
    selectedAccountId: string;
}

const ForwardingPopImapTab: React.FC<ForwardingPopImapTabProps> = ({ database, setDatabase, setHasChanges, selectedAccountId }) => {
    const { currentPage } = useNavigation();
    const allAccounts = useMemo(() => (database.email_accounts?.data as EmailAccount[]) || [], [database.email_accounts]);
    const isDefaultMode = selectedAccountId === 'default';

    const initialSettings = useMemo(() => {
        if (isDefaultMode) {
            return {};
        }
        const account = allAccounts.find(acc => acc.id === selectedAccountId);
        if (account) {
            return {
                ...account,
                forwarding_enabled: !!account.forwarding_enabled,
                vacation_responder_enabled: !!(account as any).vacation_responder_enabled,
            };
        }
        return {};
    }, [selectedAccountId, allAccounts, isDefaultMode]);

    const [currentSettings, setCurrentSettings] = useState<Partial<EmailAccount & { vacation_responder_enabled: boolean }>>(initialSettings);
    
    useEffect(() => {
        setCurrentSettings(initialSettings);
    }, [initialSettings]);

    const hasChanges = useMemo(() => JSON.stringify(currentSettings) !== JSON.stringify(initialSettings), [currentSettings, initialSettings]);

    useEffect(() => {
        setHasChanges(hasChanges);
    }, [hasChanges, setHasChanges]);

    const handleSettingChange = (field: keyof (EmailAccount & { vacation_responder_enabled: boolean }), value: any) => {
        setCurrentSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const accountIndex = newDb.email_accounts.data.findIndex((acc: Row) => acc.id === selectedAccountId);
            if (accountIndex > -1) {
                newDb.email_accounts.data[accountIndex] = {
                    ...newDb.email_accounts.data[accountIndex],
                    ...currentSettings,
                    forwarding_enabled: currentSettings.forwarding_enabled ? 1 : 0,
                    vacation_responder_enabled: currentSettings.vacation_responder_enabled ? 1 : 0,
                };
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const accountData = {
                ...currentSettings,
                forwarding_enabled: currentSettings.forwarding_enabled ? 1 : 0,
                vacation_responder_enabled: currentSettings.vacation_responder_enabled ? 1 : 0,
            };
            const operation = [{
                type: 'UPDATE' as const,
                data: accountData,
                where: { id: selectedAccountId }
            }];
            
            const result = await updateDatabase(currentPage, 'email_accounts', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save forwarding/POP/IMAP settings to server');
            }
            alert('設定を保存しました。');
        } catch (error) {
            console.error('[ForwardingPopImapTab] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }
    };
    
    const selectedAccount = currentSettings;

    return (
        <div className="space-y-6">
            <div className="flex justify-end sticky top-0 py-2 bg-container-bg dark:bg-container-bg-dark z-10">
                <Button onClick={handleSave} disabled={!hasChanges || isDefaultMode}>このアカウントの設定を保存</Button>
            </div>
            {isDefaultMode ? (
                <div className="text-center text-muted dark:text-muted-dark p-8 bg-container-muted-bg rounded-md">
                    アカウント固有の設定を行うには、上のセレクターから個別のアカウントを選択してください。
                </div>
            ) : selectedAccount.id ? (
                <fieldset disabled={isDefaultMode} className="space-y-6">
                    <SettingsCard title="転送">
                        <div className="flex items-center gap-4">
                            <ToggleSwitch checked={selectedAccount.forwarding_enabled || false} onChange={c => handleSettingChange('forwarding_enabled', c)} />
                            <span>受信メールのコピーを次のアドレスに転送する</span>
                        </div>
                        {selectedAccount.forwarding_enabled && (
                            <div className="mt-4 pl-10 space-y-4">
                                <Input value={selectedAccount.forwarding_address || ''} onChange={e => handleSettingChange('forwarding_address', e.target.value)} placeholder="転送先メールアドレス"/>
                                <RadioGroup onValueChange={v => handleSettingChange('forwarding_action', v)} value={selectedAccount.forwarding_action || 'keep'} name="forwarding_action" className="flex flex-col gap-2 text-sm">
                                    <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="keep"><RadioGroupItem id="fwd-keep"/></RadioGroupItemWrapper><Label htmlFor="fwd-keep">受信トレイにコピーを残す</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="archive"><RadioGroupItem id="fwd-archive"/></RadioGroupItemWrapper><Label htmlFor="fwd-archive">受信トレイからアーカイブする</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="delete"><RadioGroupItem id="fwd-delete"/></RadioGroupItemWrapper><Label htmlFor="fwd-delete">削除する</Label></div>
                                </RadioGroup>
                            </div>
                        )}
                    </SettingsCard>

                    <SettingsCard title="不在通知">
                        <RadioGroup onValueChange={v => handleSettingChange('vacation_responder_enabled' as any, v === 'true')} value={String(selectedAccount.vacation_responder_enabled || false)} name="vacation_responder_enabled" className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="false"><RadioGroupItem id="vac-off" /></RadioGroupItemWrapper><Label htmlFor="vac-off">OFF</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="true"><RadioGroupItem id="vac-on" /></RadioGroupItemWrapper><Label htmlFor="vac-on">ON</Label></div>
                        </RadioGroup>
                        {selectedAccount.vacation_responder_enabled && (
                            <div className="mt-4 space-y-3 pl-6 border-l-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>開始日</Label><Input type="date" value={(selectedAccount as any).vacation_start_date || ''} onChange={e => handleSettingChange('vacation_start_date' as any, e.target.value)} /></div>
                                    <div><Label>終了日 (任意)</Label><Input type="date" value={(selectedAccount as any).vacation_end_date || ''} onChange={e => handleSettingChange('vacation_end_date' as any, e.target.value)} /></div>
                                </div>
                                <div><Label>件名</Label><Input value={(selectedAccount as any).vacation_subject || ''} onChange={e => handleSettingChange('vacation_subject' as any, e.target.value)} /></div>
                                <div><Label>メッセージ</Label><Textarea value={(selectedAccount as any).vacation_body || ''} onChange={e => handleSettingChange('vacation_body' as any, e.target.value)} rows={5} /></div>
                            </div>
                        )}
                    </SettingsCard>

                    <SettingsCard title="POPダウンロード">
                        <RadioGroup onValueChange={v => handleSettingChange('pop_status', v)} value={selectedAccount.pop_status || 'disabled'} name="pop_status" className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="enabled"><RadioGroupItem id="pop-enabled"/></RadioGroupItemWrapper><Label htmlFor="pop-enabled">このアカウントでPOPを有効にする</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="disabled"><RadioGroupItem id="pop-disabled"/></RadioGroupItemWrapper><Label htmlFor="pop-disabled">POPを無効にする</Label></div>
                        </RadioGroup>
                        {selectedAccount.pop_status === 'enabled' && (
                            <div className="mt-4 pl-6">
                                <Label className="text-sm">メールソフトでメールを受信する場合:</Label>
                                <RadioGroup onValueChange={v => handleSettingChange('pop_action', v)} value={selectedAccount.pop_action || 'keep'} name="pop_action" className="flex flex-col gap-2 text-sm mt-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="keep"><RadioGroupItem id="pop-keep"/></RadioGroupItemWrapper><Label htmlFor="pop-keep">受信トレイにコピーを残す</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="archive"><RadioGroupItem id="pop-archive"/></RadioGroupItemWrapper><Label htmlFor="pop-archive">コピーをアーカイブする</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="delete"><RadioGroupItem id="pop-delete"/></RadioGroupItemWrapper><Label htmlFor="pop-delete">コピーを削除する</Label></div>
                                </RadioGroup>
                            </div>
                        )}
                    </SettingsCard>
                    <SettingsCard title="IMAPアクセス">
                        <RadioGroup onValueChange={v => handleSettingChange('imap_status', v)} value={selectedAccount.imap_status || 'disabled'} name="imap_status" className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="enabled"><RadioGroupItem id="imap-enabled"/></RadioGroupItemWrapper><Label htmlFor="imap-enabled">このアカウントでIMAPを有効にする</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItemWrapper value="disabled"><RadioGroupItem id="imap-disabled"/></RadioGroupItemWrapper><Label htmlFor="imap-disabled">IMAPを無効にする</Label></div>
                        </RadioGroup>
                    </SettingsCard>
                </fieldset>
            ) : null}
        </div>
    );
};

export default ForwardingPopImapTab;