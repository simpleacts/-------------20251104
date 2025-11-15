
import React from 'react';
import { TimerIcon, StopIcon, Button } from '@components/atoms';

interface ActiveSession {
    id: string;
    startTime: number;
    name: string;
}

interface ActiveTimerProps {
    session: ActiveSession;
    elapsedTime: number;
    onStop: (sessionId: string) => void;
}

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const ActiveTimer: React.FC<ActiveTimerProps> = ({ session, elapsedTime, onStop }) => {
    return (
        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <span className="font-semibold text-sm">{session.name}</span>
            <div className="flex items-center gap-2">
                <span className="font-mono text-lg flex items-center gap-1">
                    <TimerIcon className="w-5 h-5"/>
                    {formatDuration(elapsedTime || 0)}
                </span>
                <Button variant="danger" size="sm" onClick={() => onStop(session.id)} aria-label="タイマーを停止">
                    <StopIcon className="w-5 h-5"/>
                </Button>
            </div>
        </div>
    );
};

export default ActiveTimer;
