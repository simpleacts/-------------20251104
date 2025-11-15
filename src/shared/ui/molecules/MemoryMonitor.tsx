import React, { useState, useEffect } from 'react';

// performance.memory の型定義
interface PerformanceMemory {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
}

// performance オブジェクトに memory プロパティを追加
declare global {
    interface Performance {
        memory?: PerformanceMemory;
    }
}

const bytesToMB = (bytes: number): string => (bytes / 1024 / 1024).toFixed(1);

const MemoryMonitor: React.FC = () => {
    const [memory, setMemory] = useState<{ used: number; total: number } | null>(null);

    useEffect(() => {
        if (!performance.memory) {
            console.log("Performance.memory API is not supported in this browser.");
            return;
        }

        const intervalId = setInterval(() => {
            const mem = performance.memory;
            if (mem) {
                setMemory({
                    used: mem.usedJSHeapSize,
                    total: mem.totalJSHeapSize,
                });
            }
        }, 1000); // 1秒ごとに更新

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    if (!memory) {
        return null; // APIがサポートされていないか、データがまだない場合は何も表示しない
    }

    const usedMB = bytesToMB(memory.used);
    const totalMB = bytesToMB(memory.total);
    const percentage = memory.total > 0 ? (memory.used / memory.total) * 100 : 0;

    let progressBarColor = 'bg-green-500';
    if (percentage > 80) {
        progressBarColor = 'bg-red-500';
    } else if (percentage > 50) {
        progressBarColor = 'bg-yellow-500';
    }

    return (
        <div className="px-2">
            <p className="text-xs font-medium text-gray-400 mb-1">
                メモリ使用量
            </p>
            <div className="text-xs text-gray-300 mb-1">
                {usedMB} MB / {totalMB} MB
            </div>
            <div className="w-full bg-base-dark-300 rounded-full h-1.5">
                <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${progressBarColor}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default MemoryMonitor;