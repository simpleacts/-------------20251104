import { AppMode } from '../types/appMode';

const APP_MODE_STORAGE_KEY = 'appMode';
export const DEFAULT_APP_MODE: AppMode = 'csv-debug';
const VALID_APP_MODES: readonly AppMode[] = ['live', 'csv-debug', 'csv-writable'];

const isBrowser = typeof window !== 'undefined';

const getStorage = (): Storage | null => {
    if (!isBrowser) {
        return null;
    }
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

export const normalizeAppMode = (mode: string | null | undefined): AppMode | null => {
    if (!mode) return null;
    const normalized = mode as AppMode;
    return VALID_APP_MODES.includes(normalized) ? normalized : null;
};

export const getPersistedAppMode = (): AppMode | null => {
    const storage = getStorage();
    if (!storage) return null;
    return normalizeAppMode(storage.getItem(APP_MODE_STORAGE_KEY));
};

export const getStoredAppMode = (): AppMode => {
    return getPersistedAppMode() ?? DEFAULT_APP_MODE;
};

export const setStoredAppMode = (mode: AppMode): void => {
    const storage = getStorage();
    if (!storage) return;
    const normalized = normalizeAppMode(mode) ?? DEFAULT_APP_MODE;
    storage.setItem(APP_MODE_STORAGE_KEY, normalized);
};

export const isLiveMode = (mode: AppMode = getStoredAppMode()): boolean => mode === 'live';

export const isCsvMode = (mode: AppMode = getStoredAppMode()): boolean =>
    mode === 'csv-debug' || mode === 'csv-writable';

export const isCsvWritableMode = (mode: AppMode = getStoredAppMode()): boolean =>
    mode === 'csv-writable';

/**
 * AppModeを取得する（エイリアス）
 * 仕様書に記載されている getAppMode() の実装
 */
export const getAppMode = getStoredAppMode;

