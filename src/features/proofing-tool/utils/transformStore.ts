import { DesignElement } from '@shared/types';

const STORAGE_KEY = 'proofingToolProductTransforms';

type TransformData = Pick<DesignElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>;
type TransformStore = Record<string, TransformData>;

const getStore = (): TransformStore => {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        return storedData ? JSON.parse(storedData) : {};
    } catch (error) {
        console.error("Error reading from localStorage", String(error));
        return {};
    }
};

const saveStore = (store: TransformStore) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
        console.error("Error writing to localStorage", String(error));
    }
};

export const saveProductTransform = (productId: string, transform: TransformData) => {
    const store = getStore();
    store[productId] = transform;
    saveStore(store);
};

export const loadProductTransform = (productId: string): TransformData | null => {
    const store = getStore();
    return store[productId] || null;
};