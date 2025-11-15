import { Button, PencilIcon, PlusIcon, TrashIcon } from '@components/atoms';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { Database, Row } from '@shared/types';
import React, { useMemo, useState } from 'react';
import EditEmailAccountModal from '../modals/EditEmailAccountModal';
import { EmailAccount } from '../types';

interface AccountsTabProps {
    database: Database;
    setDatabase: (updater: (db: Database | null) => Database | null) => void;
}

const AccountsTab: React.FC<AccountsTabProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Row | null>(null);

    const accounts = useMemo(() => (database.email_accounts?.data as EmailAccount[]) || [], [database]);

    const handleOpenModal = (account: Row | null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleSaveAccount = async (accountData: EmailAccount) => {
        const isEdit = editingAccount && !editingAccount.isNew;
        const accountId = isEdit ? accountData.id : `acc_${Date.now()}`;
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const accountsTable = newDb.email_accounts.data;
            if (isEdit) {
                const index = accountsTable.findIndex((acc: Row) => acc.id === accountData.id);
                if (index !== -1) accountsTable[index] = accountData;
            } else {
                accountsTable.push({ ...accountData, id: accountId });
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = isEdit
                ? [{ type: 'UPDATE' as const, data: accountData, where: { id: accountId } }]
                : [{ type: 'INSERT' as const, data: { ...accountData, id: accountId } }];
            
            const result = await updateDatabase(currentPage, 'email_accounts', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save email account to server');
            }
        } catch (error) {
            console.error('[AccountsTab] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }

        setIsModalOpen(false);
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (window.confirm('このメールアカウントを削除しますか？')) {
            // まずローカル状態から削除
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                newDb.email_accounts.data = newDb.email_accounts.data.filter((acc: Row) => acc.id !== accountId);
                return newDb;
            });

            // サーバーから削除
            try {
                const result = await updateDatabase(
                    currentPage,
                    'email_accounts',
                    [{ type: 'DELETE' as const, where: { id: accountId } }],
                    database
                );
                if (!result.success) {
                    throw new Error(result.error || 'Failed to delete email account from server');
                }
            } catch (error) {
                console.error('[AccountsTab] Failed to delete from server:', error);
                alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">アカウント管理</h2>
                <Button onClick={() => handleOpenModal({ isNew: true })}>
                    <PlusIcon className="w-4 h-4 mr-2"/>新規アカウントを追加
                </Button>
            </div>
            <div className="bg-container-muted-bg dark:bg-container-muted-bg-dark p-4 rounded-lg shadow-inner">
                 <div className="overflow-x-auto">
                     <table className="min-w-full divide-y text-sm">
                        <thead className="bg-container-muted-bg dark:bg-container-muted-bg-dark">
                            <tr>
                                <th className="p-2 text-left">アカウント名</th>
                                <th className="p-2 text-left">メールアドレス</th>
                                <th className="p-2 text-left">タイプ</th>
                                <th className="p-2 text-left">カラー</th>
                                <th className="p-2">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {accounts.map(account => (
                                <tr key={account.id}>
                                    <td className="p-2 font-medium">{account.name}</td>
                                    <td className="p-2">{account.email_address}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${account.account_type === 'gmail' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {account.account_type}
                                        </span>
                                    </td>
                                    <td className="p-2"><div className="w-6 h-6 rounded-full" style={{ backgroundColor: account.color }}></div></td>
                                    <td className="p-2 text-center">
                                        <div className="flex justify-center items-center">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(account)}><PencilIcon className="w-4 h-4"/></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAccount(account.id)}><TrashIcon className="w-4 h-4"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                 </div>
            </div>
            {isModalOpen && <EditEmailAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveAccount} accountData={editingAccount}/>}
        </div>
    );
};

export default AccountsTab;