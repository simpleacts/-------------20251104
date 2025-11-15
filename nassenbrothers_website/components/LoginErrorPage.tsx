import React from 'react';
import { Link } from 'react-router-dom';

export const LoginErrorPage: React.FC = () => {
    return (
        <main className="w-full max-w-screen-sm mx-auto px-4 pt-24 pb-12 bg-background flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="bg-surface p-8 border border-border-default shadow-lg w-full text-center">
                <i className="fas fa-exclamation-triangle text-5xl text-accent mb-4"></i>
                <h1 className="text-2xl font-bold text-text-heading">ログインエラー</h1>
                <p className="text-text-secondary mt-2">
                    このログインリンクは無効か、有効期限が切れています。<br/>
                    お手数ですが、再度ログインをお試しください。
                </p>
                <Link to="/login" className="mt-6 inline-block bg-primary text-white font-bold py-3 px-6 hover:bg-primary/90 transition-colors">
                    ログインページに戻る
                </Link>
            </div>
        </main>
    );
};
