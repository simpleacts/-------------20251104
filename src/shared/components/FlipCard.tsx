import React from 'react';

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
}

/**
 * 3Dカードフリップコンポーネント
 * ホバーで裏面にフリップするアニメーションを実装
 */
const FlipCard: React.FC<FlipCardProps> = ({ frontContent, backContent, className = '' }) => {
  return (
    <div className={`group w-40 h-56 perspective-[1000px] ${className}`}>
      <div className="relative w-full h-full preserve-3d group-hover:[transform:rotateY(180deg)] transition-transform duration-700">
        {/* Back - 裏面は初期状態で回転させるため、transformクラスは必要です */}
        <div className="transform absolute w-full h-full backface-hidden rotate-y-180">
          <div className="w-full h-full bg-card-bg dark:bg-card-bg-dark rounded-lg shadow-lg p-4 flex flex-col items-center justify-center">
            {backContent}
          </div>
        </div>
        
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden">
          <div className="w-full h-full bg-card-bg dark:bg-card-bg-dark rounded-lg shadow-lg p-4 flex flex-col items-center justify-center">
            {frontContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
