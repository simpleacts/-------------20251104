import React from 'react';
import ColorSettings from '../organisms/ColorSettings';

interface ColorSettingsToolProps {
    settings: Record<string, any>;
    handleSettingChange: (key: string, value: any) => void;
}

const ColorSettingsTool: React.FC<ColorSettingsToolProps> = ({ settings, handleSettingChange }) => {
    return (
        <div className="space-y-6">
            <ColorSettings settings={settings} handleSettingChange={handleSettingChange} />
        </div>
    );
};

export default ColorSettingsTool;
