import React from 'react';

const ProgressBar: React.FC<{ step: number; totalSteps: number }> = ({ step, totalSteps }) => {
    const progress = totalSteps > 1 ? ((step - 1) / (totalSteps - 1)) * 100 : (step > 0 ? 100 : 0);
    
    return (
        <div className="w-full">
            <div 
                className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full"
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={totalSteps}
                aria-label={`Step ${step} of ${totalSteps}`}
            >
                <div 
                    className="absolute top-0 left-0 h-2 bg-blue-600 rounded-full" 
                    style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}
                ></div>
            </div>
        </div>
    );
};

export default ProgressBar;