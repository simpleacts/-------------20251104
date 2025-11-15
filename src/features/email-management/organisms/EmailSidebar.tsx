import { Row } from '@shared/types';
import React from 'react';

interface EmailSidebarProps {
    accounts: Row[];
    activeFolder: string;
    onFolderSelect: (folder: string) => void;
    onCompose: () => void;
}

const EmailSidebar: React.FC<EmailSidebarProps> = ({ accounts, activeFolder, onFolderSelect, onCompose }) => {
    const folders = [
        { id: 'inbox', name: '受信トレイ', icon: 'fa-inbox' },
        { id: 'drafts', name: '下書き', icon: 'fa-file-alt' },
        { id: 'sent', name: '送信済み', icon: 'fa-paper-plane' },
        { id: 'trash', name: 'ゴミ箱', icon: 'fa-trash' },
    ];

    return (
        <div className="p-2 flex flex-col h-full">
            <button
                onClick={onCompose}
                className="w-full bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark font-bold py-2 rounded-md mb-4 flex-shrink-0 hover:opacity-90"
            >
                メールを作成
            </button>
            <ul className="space-y-1 text-sm font-semibold mb-4">
                {folders.map(folder => (
                    <li
                        key={folder.id}
                        onClick={() => onFolderSelect(folder.id)}
                        className={`p-2 rounded-md cursor-pointer flex items-center ${activeFolder === folder.id ? 'bg-blue-100 dark:bg-blue-900/50 text-brand-primary' : 'hover:bg-hover-bg dark:hover:bg-hover-bg-dark'}`}
                    >
                        <i className={`fa-solid ${folder.icon} w-6 mr-2 text-muted`}></i>
                        {folder.name}
                    </li>
                ))}
            </ul>
            <h3 className="text-xs font-bold text-muted dark:text-muted-dark px-2 mb-2">アカウント</h3>
            <ul className="space-y-1 text-sm overflow-y-auto">
                {accounts.map(acc => (
                    <li key={acc.id as string} className="p-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color as string }}></span>
                        <span className="truncate">{acc.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default EmailSidebar;
