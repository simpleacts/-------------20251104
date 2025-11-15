import { DesignElement } from '@shared/types';
import React from 'react';

interface CanvasPreviewProps {
    layers: DesignElement[];
    width: number;
    height: number;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ layers, width, height }) => {
    // Assuming the original canvas was 600x600 for scaling purposes
    const originalWidth = 600; 
    const originalHeight = 600;

    const scaleX = width / originalWidth;
    const scaleY = height / originalHeight;

    return (
        <div 
            className="relative bg-white dark:bg-gray-500 overflow-hidden" 
            style={{ width, height }}
        >
            {[...layers].reverse().map(layer => {
                if (!layer.visible) return null;

                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: layer.x * scaleX,
                    top: layer.y * scaleY,
                    width: layer.width * scaleX,
                    height: layer.height * scaleY,
                    transform: `rotate(${layer.rotation}deg)`,
                };

                return (
                    <div key={layer.id} style={style}>
                         <img 
                            src={layer.src} 
                            alt="layer content" 
                            className="w-full h-full pointer-events-none"
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default CanvasPreview;