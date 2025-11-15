import { Textarea, XMarkIcon } from '@components/atoms';
import { Row } from '@shared/types';
import React, { useEffect, useState } from 'react';
import { EmailAccount } from '../types';

interface EditEmailAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: EmailAccount) => void;
    accountData: Row | null;
}

const EditEmailAccountModal: React.FC<EditEmailAccountModalProps> = ({ isOpen, onClose, onSave, accountData }) => {
    const [formData, setFormData] = useState<Partial<EmailAccount>>({});

    const isNew = accountData?.isNew;

    useEffect(() => {
        if (accountData) {
            setFormData(accountData);
        }
    }, [accountData]);

    if (!isOpen) return null;

    const handleChange = (field: keyof EmailAccount, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData as EmailAccount);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">{isNew ? '新規アカウント' : 'アカウント編集'}</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">アカウント名</label>
                            <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full p-2 border rounded" placeholder="例: 営業用メール"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">メールアドレス</label>
                            <input type="email" value={formData.email_address || ''} onChange={e => handleChange('email_address', e.target.value)} className="w-full p-2 border rounded" placeholder="例: sales@example.com"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">アカウントタイプ</label>
                            <select value={formData.account_type || 'standard'} onChange={e => handleChange('account_type', e.target.value as any)} className="w-full p-2 border rounded">
                                <option value="standard">標準 (IMAP/SMTP)</option>
                                <option value="gmail">Google連携 (Gmail)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">識別カラー</label>
                            <input type="color" value={formData.color || '#3b82f6'} onChange={e => handleChange('color', e.target.value)} className="w-full h-10 p-1 border rounded"/>
                        </div>
                    </div>
                    
                    {formData.account_type === 'standard' && (
                        <div className="space-y-4 pt-4 border-t">
                             <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm rounded-md">
                                <strong>セキュリティに関するご注意:</strong> パスワードはデータベースに直接保存されます。セキュリティ向上のため、通常のログインパスワードではなく、メールサービスが提供する「アプリパスワード」の使用を強く推奨します。
                            </div>
                            <h3 className="font-semibold text-lg">受信サーバー (IMAP)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-sm">ホスト</label><input type="text" value={formData.incoming_server_host || ''} onChange={e => handleChange('incoming_server_host', e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">ポート</label><input type="number" value={formData.incoming_server_port || 993} onChange={e => handleChange('incoming_server_port', +e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">ユーザー名</label><input type="text" value={formData.incoming_server_user || ''} onChange={e => handleChange('incoming_server_user', e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">パスワード</label><input type="password" value={formData.incoming_server_password || ''} onChange={e => handleChange('incoming_server_password', e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div className="col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.incoming_server_ssl ?? true} onChange={e => handleChange('incoming_server_ssl', e.target.checked)}/> SSLを使用する</label></div>
                            </div>

                            <h3 className="font-semibold text-lg pt-4 border-t">送信サーバー (SMTP)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-sm">ホスト</label><input type="text" value={formData.smtp_server_host || ''} onChange={e => handleChange('smtp_server_host', e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">ポート</label><input type="number" value={formData.smtp_server_port || 587} onChange={e => handleChange('smtp_server_port', +e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">ユーザー名</label><input type="text" value={formData.smtp_server_user || ''} onChange={e => handleChange('smtp_server_user', e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">パスワード</label><input type="password" value={formData.smtp_server_password || ''} onChange={e => handleChange('smtp_server_password', e.target.value)} className="w-full p-2 border rounded"/></div>
                                <div className="col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.smtp_server_ssl ?? true} onChange={e => handleChange('smtp_server_ssl', e.target.checked)}/> 暗号化 (TLS/STARTTLS) を使用する</label></div>
                            </div>
                        </div>
                    )}
                    
                    <div className="pt-4 border-t">
                        <label className="block text-sm font-medium mb-1">署名</label>
                        <Textarea 
                            value={formData.signature || ''} 
                            onChange={e => handleChange('signature', e.target.value)} 
                            rows={4} 
                            placeholder="--&#10;名前&#10;会社名"
                            className="font-mono text-xs"
                        />
                    </div>

                    {formData.account_type === 'gmail' && (
                         <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-md mt-4">
                            <strong>Google連携アカウントに関するご注意:</strong>
                            <ul className="list-disc list-inside mt-2">
                                <li>このタイプのアカウントは、システム全体で1つだけ設定できます。</li>
                                <li>接続設定は「Google連携設定」ツールで行います。ここでの個別設定は不要です。</li>
                                <li>認証が完了すると、このアカウントがメール送受信やGoogle Drive連携で自動的に使用されます。</li>
                            </ul>
                        </div>
                    )}

                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default EditEmailAccountModal;
