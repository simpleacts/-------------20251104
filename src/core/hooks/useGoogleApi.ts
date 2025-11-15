import { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { loadGapi, initClient } from '../../features/google-api-settings/services/googleApiService';

function useGoogleApi() {
    const { database } = useDatabase();
    const [isGapiScriptLoaded, setIsGapiScriptLoaded] = useState(false);
    const [isGapiReady, setIsGapiReady] = useState(false);

    useEffect(() => {
        loadGapi(() => {
            setIsGapiScriptLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (isGapiScriptLoaded && database?.google_api_settings && !isGapiReady) {
            // FIX: Add explicit type to new Map to avoid type inference issues.
            const settings = new Map<string, any>((database.google_api_settings.data || []).map(s => [s.key as string, s.value]));
            const apiKey = settings.get('API_KEY') as string;
            const clientId = settings.get('CLIENT_ID') as string;
            const scopes = (settings.get('SCOPES') as string || 'https://www.googleapis.com/auth/drive.file').split(',');

            if (apiKey && clientId) {
                initClient({ apiKey, clientId, scopes }, () => setIsGapiReady(true));
            } else {
                console.warn("Google連携設定 not configured in 'Google連携設定'. Google integration will be unavailable.");
            }
        }
    }, [isGapiScriptLoaded, database, isGapiReady]);

    return { isGapiReady };
}

export default useGoogleApi;