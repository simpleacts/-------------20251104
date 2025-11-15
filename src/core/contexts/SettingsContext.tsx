import React, { createContext } from 'react';

interface SettingsContextType {
    tooltipEnabled: boolean;
    tooltipDelay: number;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider = SettingsContext.Provider;