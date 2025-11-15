import React from 'react';
import BehaviorSettings from '../organisms/BehaviorSettings';

interface BehaviorSettingsToolProps {
    settings: Record<string, any>;
    handleSettingChange: (key: string, value: any) => void;
}

const BehaviorSettingsTool: React.FC<BehaviorSettingsToolProps> = ({ settings, handleSettingChange }) => {
    return (
        <div className="space-y-6">
            <BehaviorSettings settings={settings} handleSettingChange={handleSettingChange} />
        </div>
    );
};

export default BehaviorSettingsTool;
