import React from 'react';
import { Database } from '@shared/types';
import LayoutSettings from '../organisms/LayoutSettings';

interface LayoutSettingsToolProps {
    settings: Record<string, any>;
    handleSettingChange: (key: string, value: any) => void;
    database: Partial<Database> | null;
}

const LayoutSettingsTool: React.FC<LayoutSettingsToolProps> = ({ settings, handleSettingChange, database }) => {
    return (
        <div className="space-y-6">
            <LayoutSettings settings={settings} handleSettingChange={handleSettingChange} database={database} />
        </div>
    );
};

export default LayoutSettingsTool;