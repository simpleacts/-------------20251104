
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Row } from '@shared/types';
import { XMarkIcon } from '@components/atoms';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Row) => void;
    userData: Row | null;
    roles: Row[];
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, onSave, userData, roles }) => {
    const { t } = useTranslation('user-manager');
    const [formData, setFormData] = useState<Row>({});
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const isNew = userData?.isNew;

    useEffect(() => {
        if (userData) {
            setFormData(userData);
            setPassword('');
            setPasswordConfirm('');
            setPasswordError(null);
        }
    }, [userData]);

    if (!isOpen) return null;

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        setPasswordError(null);
        let finalUserData = { ...formData };

        if (password) {
            if (password !== passwordConfirm) {
                setPasswordError(t('users.edit.password_mismatch', 'パスワードが一致しません。'));
                return;
            }
            finalUserData.password = password;
        }

        if (isNew) {
            finalUserData.id = `user_${Date.now()}`;
        }

        onSave(finalUserData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{isNew ? t('users.edit.create_title', '新規ユーザー作成') : t('users.edit.edit_title', 'ユーザー情報の編集')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.edit.name_label', '名前')}</label>
                        <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.edit.username_label', 'ユーザー名')}</label>
                        <input type="text" value={formData.username || ''} onChange={e => handleChange('username', e.target.value)} className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.edit.role_label', '役割')}</label>
                        <select value={formData.role_id || ''} onChange={e => handleChange('role_id', e.target.value)} className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md">
                            <option value="">{t('users.edit.role_select', '役割を選択...')}</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">{isNew ? t('users.edit.password_setting', 'パスワード設定') : t('users.edit.password_change', 'パスワードを変更')}</p>
                        {passwordError && <p className="text-red-500 text-xs mb-2">{passwordError}</p>}
                        <div className="grid grid-cols-2 gap-4">
                            <input type="password" placeholder={t('users.edit.new_password_placeholder', '新しいパスワード')} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md" />
                            <input type="password" placeholder={t('users.edit.password_confirm_placeholder', 'パスワードの確認')} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md" />
                        </div>
                    </div>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">{t('users.edit.cancel', 'キャンセル')}</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">{t('users.edit.save', '保存')}</button>
                </footer>
            </div>
        </div>
    );
};

export default UserEditModal;
