import React, { useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import { PencilIcon, PlusIcon, TrashIcon } from '@components/atoms';
import UserEditModal from '../modals/UserEditModal';

interface UserManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const UserManager: React.FC<UserManagerProps> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const { t } = useTranslation('user-manager');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Row | null>(null);

    // FIX: Explicitly type the Map to resolve type errors on usage.
    const rolesMap = useMemo(() => new Map<string, string>(database.roles.data.map(r => [r.id as string, r.name as string])), [database.roles.data]);

    const handleOpenModal = (user: Row | null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };

    const handleSaveUser = async (user: Row) => {
        const isEdit = editingUser && !editingUser.isNew;
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const usersTable = newDb.users.data;
            
            if (isEdit) {
                const index = usersTable.findIndex((u: Row) => u.id === user.id);
                if (index !== -1) {
                    usersTable[index] = user;
                }
            } else {
                usersTable.push(user);
            }

            return newDb;
        });

        // サーバーに保存
        try {
            const operation = isEdit
                ? [{ type: 'UPDATE' as const, data: user, where: { id: user.id } }]
                : [{ type: 'INSERT' as const, data: user }];
            
            const result = await updateDatabase(currentPage, 'users', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save user to server');
            }
        } catch (error) {
            console.error('[UserManager] Failed to save user to server:', error);
            alert(t('users.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }

        handleCloseModal();
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm(t('users.delete_confirm', 'このユーザーを削除してもよろしいですか？'))) {
            // まずローカル状態から削除
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                newDb.users.data = newDb.users.data.filter((u: Row) => u.id !== userId);
                return newDb;
            });

            // サーバーから削除
            try {
                const result = await updateDatabase(
                    currentPage,
                    'users',
                    [{ type: 'DELETE' as const, where: { id: userId } }],
                    database
                );
                if (!result.success) {
                    throw new Error(result.error || 'Failed to delete user from server');
                }
            } catch (error) {
                console.error('[UserManager] Failed to delete user from server:', error);
                alert(t('users.delete_failed', 'サーバーからの削除に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('users.title', 'ユーザー管理')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('users.description', 'ユーザーの追加、編集、役割の割り当てを行います。')}</p>
                </div>
                <button
                    onClick={() => handleOpenModal({ isNew: true })}
                    className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg"
                >
                    <PlusIcon className="w-5 h-5" /> {t('users.add_new', '新規ユーザーを追加')}
                </button>
            </header>

            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-auto h-full">
                    <table className="min-w-full divide-y divide-base-300 dark:divide-base-dark-300">
                        <thead className="sticky top-0 bg-base-100 dark:bg-base-dark-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">{t('users.name_header', '名前')}</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">{t('users.username_header', 'ユーザー名')}</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">{t('users.role_header', '役割')}</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">{t('users.actions_header', '操作')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                            {database.users.data.map(user => (
                                <tr key={user.id as string}>
                                    <td className="px-4 py-3 font-medium">{user.name as React.ReactNode}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.username as React.ReactNode}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                            {/* FIX: Cast result to ReactNode to satisfy type checking. */}
                                            {rolesMap.get(user.role_id as string) || t('users.role_not_set', '未設定') as React.ReactNode}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleOpenModal(user)} className="p-1 text-blue-600 hover:text-blue-800 mr-2"><PencilIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteUser(user.id as string)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <UserEditModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveUser}
                    userData={editingUser}
                    roles={database.roles.data}
                />
            )}
        </div>
    );
};

export default UserManager;