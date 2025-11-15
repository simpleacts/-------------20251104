import React, { useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { Database, Row } from '@shared/types';
import { PencilIcon, PlusIcon, TrashIcon } from '@components/atoms';
import EditEmailAccountModal from '../modals/EditEmailAccountModal';
import { EmailAccount } from '../types';

interface EmailAccountSettingsToolProps {
    database: Partial<Database> | null;
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
}

const EmailAccountSettingsTool: React.FC<EmailAccountSettingsToolProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Row | null>(null);

    const accounts = useMemo(() => (database?.email_accounts?.data as EmailAccount[]) || [], [database]);

    const handleOpenModal = (account: Row | null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingAccount(null);
        setIsModalOpen(false);
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
                if (index !== -1) {
                    accountsTable[index] = accountData;
                }
            } else {
                accountsTable.push({
                    ...accountData,
                    id: accountId,
                });
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = isEdit
                ? [{ type: 'UPDATE' as const, data: accountData, where: { id: accountId } }]
                : [{ type: 'INSERT' as const, data: { ...accountData, id: accountId } }];
            
            if (database) {
                const result = await updateDatabase(currentPage, 'email_accounts', operation, database as Database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save email account to server');
                }
            }
        } catch (error) {
            console.error('[EmailAccountSettings] Failed to save to server:', error);
            alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
        }

        handleCloseModal();
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
                if (database) {
                    const result = await updateDatabase(
                        currentPage,
                        'email_accounts',
                        [{ type: 'DELETE' as const, where: { id: accountId } }],
                        database as Database
                    );
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to delete email account from server');
                    }
                }
            } catch (error) {
                console.error('[EmailAccountSettings] Failed to delete from server:', error);
                alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };

    if (!database) {
        return null;
    }

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">メールアカウント設定</h1>
                    <p className="text-gray-500 mt-1">メールの送受信に使用するアカウントを管理します。</p>
                </div>
                <button
                    onClick={() => handleOpenModal({ isNew: true })}
                    className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg"
                >
                    <PlusIcon className="w-5 h-5" /> 新規アカウントを追加
                </button>
            </header>

            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-auto h-full">
                    <table className="min-w-full divide-y divide-base-300 dark:divide-base-dark-300">
                        <thead className="sticky top-0 bg-base-100 dark:bg-base-dark-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">アカウント名</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">メールアドレス</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">タイプ</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">カラー</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                            {accounts.map(account => (
                                <tr key={account.id}>
                                    <td className="px-4 py-3 font-medium">{account.name}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{account.email_address}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${account.account_type === 'gmail' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {account.account_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: account.color }}></div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleOpenModal(account)} className="p-1 text-blue-600 hover:text-blue-800 mr-2"><PencilIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteAccount(account.id)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <EditEmailAccountModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveAccount}
                    accountData={editingAccount}
                />
            )}
        </div>
    );
};

export default EmailAccountSettingsTool;
