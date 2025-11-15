import React from 'react';

const SettingsCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-container-muted-bg dark:bg-container-muted-bg-dark p-4 rounded-lg shadow-inner ${className}`}>
        <h3 className="font-bold mb-4 border-b border-default pb-2 text-lg">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

export { SettingsCard };