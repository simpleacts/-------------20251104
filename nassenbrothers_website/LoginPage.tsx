import React, { useState } from 'react';
import { AppData } from '../types';

interface LoginPageProps {
  appData: AppData;
}

export const LoginPage: React.FC<LoginPageProps> = ({ appData }) => {
  const { uiText } = appData;
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/login-request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'ログインリンクの送信に失敗しました。');
      }

      setStatus('success');

    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
      setStatus('error');
    }
  };

  return (
    <main className="w-full max-w-screen-sm mx-auto px-4 pt-24 pb-12 bg-background flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="bg-surface p-8 border border-border-default shadow-lg w-full">
        {status !== 'success' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <i className="fas fa-magic text-3xl text-primary mb-2"></i>
              <h1 className="text-2xl font-bold text-text-heading">マイページへログイン</h1>
              <p className="text-text-secondary mt-2">ご登録のメールアドレスを入力してください。<br/>ログイン用のリンクを送信します。</p>
            </div>
            
            {status === 'error' && error && (
              <div className="bg-red-50 p-3 border border-red-200 text-accent" role="alert">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">メールアドレス</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-border-default focus:ring-secondary focus:border-secondary text-base"
                placeholder="email@example.com"
                disabled={status === 'loading'}
              />
            </div>
            
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary text-white font-bold py-3 px-4 hover:bg-primary/90 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-wait"
            >
              {status === 'loading' ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  <span>ログインリンクを送信</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 py-8">
            <i className="fas fa-envelope-circle-check text-5xl text-green-500"></i>
            <h2 className="text-xl font-bold text-text-heading">メールをご確認ください</h2>
            <p className="text-text-secondary">
              <strong>{email}</strong> 宛にログイン用のリンクを送信しました。<br/>
              メールに記載されたリンクをクリックしてログインを完了してください。
            </p>
            <p className="text-xs text-text-secondary">リンクの有効期限は15分です。</p>
          </div>
        )}
      </div>
    </main>
  );
};
