import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const LoginCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const verifyToken = async () => {
            const searchParams = new URLSearchParams(location.search);
            const token = searchParams.get('token');

            if (!token) {
                navigate('/login/error', { replace: true });
                return;
            }

            try {
                const response = await fetch('/api/login-verify.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Token verification failed.');
                }
                
                // On successful verification, store the session token from the backend
                localStorage.setItem('authToken', result.sessionToken);

                // Redirect to the user's dashboard, replacing the callback URL in history
                navigate('/my-page/dashboard', { replace: true });

            } catch (error) {
                console.error('Login callback error:', error);
                navigate('/login/error', { replace: true });
            }
        };

        verifyToken();
        
    }, [navigate, location.search]);

    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
            <div className="w-12 h-12 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-text-secondary">ログインしています...</p>
        </div>
    );
};
