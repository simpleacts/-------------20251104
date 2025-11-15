import React from 'react';

interface GuideStepProps {
  number: number;
  title: string;
  children: React.ReactNode;
  isFinal?: boolean;
}

const GuideStep: React.FC<GuideStepProps> = ({ number, title, children, isFinal = false }) => {
  return (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold flex-shrink-0">{number}</div>
            {!isFinal && <div className="w-px flex-grow bg-base-300 dark:bg-base-dark-300 my-2"></div>}
        </div>
        <div className={isFinal ? 'flex-1' : 'pb-8 flex-1'}>
            <h4 className="font-bold mb-1">{title}</h4>
            <div className="text-muted dark:text-muted-dark space-y-2 text-sm leading-relaxed">{children}</div>
        </div>
    </div>
  );
};

export default GuideStep;
