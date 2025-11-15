import React from 'react';
import { Link } from 'react-router-dom';

const featureCards = [
    { title: 'ページ編集', icon: 'fa-file-alt', path: '/admin/pages', description: '静的ページのコンテンツを編集します。' },
    { title: '記事管理', icon: 'fa-newspaper', path: '/admin/articles', description: 'お役立ちコンテンツを作成・編集します。' },
    { title: 'ギャラリー管理', icon: 'fa-images', path: '/admin/gallery', description: '制作実績ギャラリーを管理します。' },
    { title: 'テーマエディタ', icon: 'fa-palette', path: '/admin/theme-editor', description: 'サイトの配色やフォントを編集します。' },
    { title: 'UIテキスト編集', icon: 'fa-language', path: '/admin/ui-text', description: 'サイト全体のテキストを編集します。' },
    { title: 'アセット管理', icon: 'fa-photo-video', path: '/admin/assets', description: '画像や動画などのファイルを管理します。' },
    { title: '開発ツール', icon: 'fa-tools', path: '/admin/devtools', description: '動作モードの切り替えなどを行います。' },
    { title: 'システムログ', icon: 'fa-shield-alt', path: '/admin/logs', description: 'アプリケーションのエラーログを確認します。' }
];

const AdminDashboard: React.FC = () => {
    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6">管理ダッシュボード</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featureCards.map(card => (
                    <Link to={card.path} key={card.path} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group">
                        <div className="flex items-center mb-4">
                            <div className="text-2xl text-primary mr-4 w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full transition-colors group-hover:bg-primary group-hover:text-white">
                                <i className={`fas ${card.icon}`}></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">{card.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 flex-grow">{card.description}</p>
                        <div className="mt-4 text-right text-secondary font-semibold text-sm group-hover:underline">
                            移動する <i className="fas fa-arrow-right ml-1"></i>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default AdminDashboard;
