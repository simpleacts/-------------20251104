import React from 'react';
import { ToggleSwitch } from '@components/atoms';
import { SettingsCard } from '@components/molecules';

interface BehaviorSettingsProps {
    settings: Record<string, any>;
    handleSettingChange: (key: string, value: any) => void;
}

const BehaviorSettings: React.FC<BehaviorSettingsProps> = ({ settings, handleSettingChange }) => {
    
    const getButtonClasses = (isActive: boolean) => 
        `flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            isActive 
                ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark shadow' 
                : 'bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-80'
        }`;

    const speedOptions = [{label: '速い', value: 'fast'}, {label: '標準', value: 'normal'}, {label: '遅い', value: 'slow'}];

    return (
        <SettingsCard title="アプリケーションの動作">
             <div className="max-w-md mx-auto space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">アニメーション速度</label>
                    <div className="flex items-center gap-2 p-1 bg-container-muted-bg dark:bg-container-muted-bg-dark rounded-lg">
                        {speedOptions.map(opt => (
                            <button key={opt.value} onClick={() => handleSettingChange('UI_ANIMATION_SPEED', opt.value)} className={getButtonClasses(settings.UI_ANIMATION_SPEED === opt.value)}>{opt.label}</button>
                        ))}
                    </div>
                </div>
                <div className="p-4 border rounded-lg bg-base-100 dark:bg-base-dark-200 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-sm">ツールチップを表示</h3>
                            <p className="text-xs text-muted dark:text-muted-dark">アイコンなどにマウスを合わせた際に補助的な説明を表示します。</p>
                        </div>
                        <ToggleSwitch 
                            checked={settings.UI_TOOLTIP_ENABLED === true || settings.UI_TOOLTIP_ENABLED === 'true'} 
                            onChange={(c) => handleSettingChange('UI_TOOLTIP_ENABLED', c)} 
                        />
                    </div>
                    {(settings.UI_TOOLTIP_ENABLED === true || settings.UI_TOOLTIP_ENABLED === 'true') && (
                        <div>
                            <label htmlFor="tooltip-delay" className="block text-sm font-medium">表示遅延 (ミリ秒)</label>
                            <input 
                                id="tooltip-delay"
                                type="number" 
                                value={settings.UI_TOOLTIP_DELAY || 300}
                                onChange={e => handleSettingChange('UI_TOOLTIP_DELAY', Number(e.target.value))}
                                className="w-full mt-1 p-2 border rounded"
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-base-100 dark:bg-base-dark-200">
                    <div>
                        <h3 className="font-semibold text-sm">コマンドパレット <kbd className="font-sans">⌘/Ctrl+K</kbd></h3>
                        <p className="text-xs text-muted dark:text-muted-dark">キーボードショートカットでツールやテーブルを素早く検索する機能を有効にします。</p>
                    </div>
                    <ToggleSwitch 
                        checked={settings.UI_COMMAND_PALETTE_ENABLED === true || settings.UI_COMMAND_PALETTE_ENABLED === 'true'} 
                        onChange={(c) => handleSettingChange('UI_COMMAND_PALETTE_ENABLED', c)} 
                    />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-base-100 dark:bg-base-dark-200">
                    <div>
                        <h3 className="font-semibold text-sm">アニメーションを抑制</h3>
                         <p className="text-xs text-muted dark:text-muted-dark">UIの動き（アニメーション）を減らし、表示を高速化します。</p>
                    </div>
                    <ToggleSwitch 
                        checked={settings.UI_REDUCE_MOTION === true || settings.UI_REDUCE_MOTION === 'true'} 
                        onChange={(c) => handleSettingChange('UI_REDUCE_MOTION', c)} 
                    />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-base-100 dark:bg-base-dark-200">
                    <div>
                        <h3 className="font-semibold text-sm">削除時の確認をスキップ</h3>
                        <p className="text-xs text-muted dark:text-muted-dark">データの削除時に表示される確認ダイアログを表示しないようにします。</p>
                    </div>
                    <ToggleSwitch 
                        checked={settings.BEHAVIOR_SKIP_DELETE_CONFIRM === true || settings.BEHAVIOR_SKIP_DELETE_CONFIRM === 'true'} 
                        onChange={(c) => handleSettingChange('BEHAVIOR_SKIP_DELETE_CONFIRM', c)} 
                    />
                </div>
            </div>
        </SettingsCard>
    );
};

export default BehaviorSettings;