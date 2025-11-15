import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImagePreviewModalProps {
  imageUrls: string[];
  imageAlts?: string[];
  title: string;
  onClose: () => void;
  initialIndex?: number;
  uiText: Record<string, string>;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;

// Helper function to determine initial scale based on screen width
const getInitialScale = () => {
  if (window.innerWidth < 768) { // md breakpoint
    return 0.25; // Mobile: 25%
  }
  return 0.4; // PC/Tablet: 40%
};

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrls, imageAlts, title, onClose, initialIndex = 0, uiText }) => {
  const [scale, setScale] = useState(getInitialScale);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleZoom = useCallback((factor: number, centerX: number, centerY: number) => {
    if (!viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const pivotX = centerX - rect.left;
    const pivotY = centerY - rect.top;

    const dx = pivotX - rect.width / 2;
    const dy = pivotY - rect.height / 2;

    setScale(oldScale => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * factor));
        if (newScale === oldScale) return oldScale;

        const ratio = newScale / oldScale;
        
        setPan(oldPan => ({
            x: dx * (1 - ratio) + oldPan.x * ratio,
            y: dy * (1 - ratio) + oldPan.y * ratio,
        }));

        return newScale;
    });
  }, []);
  
  const handleReset = useCallback(() => {
    setScale(getInitialScale());
    setPan({x: 0, y: 0});
  }, []);

  const handlePrev = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
      handleReset();
  }, [imageUrls.length, handleReset]);

  const handleNext = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
      handleReset();
  }, [imageUrls.length, handleReset]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1 - e.deltaY * 0.001;
        handleZoom(zoomFactor, e.clientX, e.clientY);
    };

    viewport.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
        viewport.removeEventListener('wheel', wheelHandler);
    };
  }, [handleZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isPanningRef.current = true;
    lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPanPointRef.current.x;
    const dy = e.clientY - lastPanPointRef.current.y;
    setPan(prevPan => ({ x: prevPan.x + dx, y: prevPan.y + dy }));
    lastPanPointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isPanningRef.current = false;
    if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
  };
  
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
        isPanningRef.current = true;
        lastPanPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
        isPanningRef.current = false; // Stop panning when pinch starts
        lastTouchDistanceRef.current = getTouchDistance(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanningRef.current) {
        const dx = e.touches[0].clientX - lastPanPointRef.current.x;
        const dy = e.touches[0].clientY - lastPanPointRef.current.y;
        setPan(prevPan => ({ x: prevPan.x + dx, y: prevPan.y + dy }));
        lastPanPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
        const newDist = getTouchDistance(e.touches);
        if (lastTouchDistanceRef.current === 0) { // Avoid division by zero on first move
            lastTouchDistanceRef.current = newDist;
            return;
        }

        const zoomFactor = newDist / lastTouchDistanceRef.current;
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        handleZoom(zoomFactor, centerX, centerY);
        
        lastTouchDistanceRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    lastTouchDistanceRef.current = 0;
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
        handleReset();
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, imageUrls.length, handleReset]);

  const handleButtonZoom = (factor: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    handleZoom(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  return (
    <div 
      className="fixed inset-0 z-[60] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 bg-white text-black border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="max-w-prose">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-600">{imageAlts?.[currentIndex] || `${uiText['imagePreview.titleSuffix']?.replace('{{index}}', (currentIndex + 1).toString())}`}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 text-2xl hover:text-black w-10 h-10 flex items-center justify-center"
            aria-label={uiText['common.close']}
          >
            &times;
          </button>
        </header>

        <main
          ref={viewportRef}
          className="flex-1 overflow-hidden bg-white flex items-center justify-center touch-none relative"
          style={{ cursor: 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageUrls[currentIndex]}
            alt={imageAlts?.[currentIndex] || title}
            draggable="false"
            className="max-w-none max-h-none transition-opacity duration-200"
            key={imageUrls[currentIndex]}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center center' }}
          />
           {imageUrls.length > 1 && (
                <>
                    <button 
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                        aria-label={uiText['imagePreview.prevAriaLabel']}
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <button 
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                        aria-label={uiText['imagePreview.nextAriaLabel']}
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </>
           )}
        </main>

        <footer 
          className="bg-white border-t p-2 flex justify-center items-center gap-2 flex-shrink-0"
        >
          <button onClick={() => handleButtonZoom(1 / 1.25)} className="w-8 h-8 bg-gray-200 text-black font-bold shadow rounded hover:bg-gray-300 transition-colors" title="縮小"><i className="fas fa-minus"></i></button>
          <span className="w-16 text-center text-sm font-mono tabular-nums px-1 text-black">{Math.round(scale * 100)}%</span>
          <button onClick={() => handleButtonZoom(1.25)} className="w-8 h-8 bg-gray-200 text-black font-bold shadow rounded hover:bg-gray-300 transition-colors" title="拡大"><i className="fas fa-plus"></i></button>
          <button onClick={handleReset} className="h-8 px-3 bg-gray-200 text-black text-sm font-bold shadow rounded hover:bg-gray-300 transition-colors ml-4" title={uiText['imagePreview.reset']}>{uiText['imagePreview.reset']}</button>
          {imageUrls.length > 1 && (
            <div className="absolute left-4 bottom-4 text-sm bg-black/50 text-white px-3 py-1 rounded">
              {uiText['imagePreview.pagination']?.replace('{{current}}', (currentIndex + 1).toString()).replace('{{total}}', imageUrls.length.toString())}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};