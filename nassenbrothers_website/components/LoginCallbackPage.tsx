import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const LoginCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');

        // In a real build, this would take the token, verify it with a backend API,
        // and get a session token in return.
        // For local dev, we simulate a successful login immediately.
        console.log(`Bypassing token verification for dev. Token: ${token}`);
        
        // Simulate setting a session token
        localStorage.setItem('authToken', 'dev-mock-token');

        // Redirect to the user's dashboard, replacing the callback URL in history
        navigate('/my-page/dashboard', { replace: true });
        
    }, [navigate, location.search]);

    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
            <div className="w-12 h-12 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-text-secondary">ログインしています...</p>
        </div>
    );
};