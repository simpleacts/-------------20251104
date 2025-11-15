import React, { useState, useRef, cloneElement, ReactElement, useEffect, useContext } from 'react';
import { SettingsContext } from '@core/contexts/SettingsContext';

interface TooltipProps {
  children: ReactElement;
  content: React.ReactNode;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, delay }) => {
  const settings = useContext(SettingsContext);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  
  const finalDelay = delay ?? settings?.tooltipDelay ?? 300;
  const isTooltipEnabled = settings?.tooltipEnabled ?? true;

  const showTooltip = () => {
    if (!isTooltipEnabled) return;
    timerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, finalDelay);
  };

  const hideTooltip = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setVisible(false);
  };
  
  useEffect(() => {
    return () => {
      if(timerRef.current) clearTimeout(timerRef.current);
    }
  }, []);

  if (!isTooltipEnabled) {
    return children;
  }

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {cloneElement(children, {
        'aria-describedby': visible ? 'tooltip-content' : undefined,
      } as any)}
      {visible && (
        <div
          id="tooltip-content"
          role="tooltip"
          className="absolute z-50 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-90
                     bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};