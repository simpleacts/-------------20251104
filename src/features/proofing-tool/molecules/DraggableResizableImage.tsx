import { DesignElement } from '@shared/types';
import React, { useCallback, useRef } from 'react';

interface DraggableResizableImageProps {
    element: DesignElement;
    onUpdate: (id: string, updates: Partial<DesignElement>) => void;
    onSelect: (id: string) => void;
    isSelected: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
    disableRotation?: boolean;
    zIndex?: number;
}


const DraggableResizableImage: React.FC<DraggableResizableImageProps> = ({ element, onUpdate, onSelect, isSelected, containerRef, disableRotation = false, zIndex = 10 }) => {
    const ref = useRef<HTMLDivElement>(null);
    const interaction = useRef({ type: '', startX: 0, startY: 0, startW: 0, startH: 0, startXEl: 0, startYEl: 0 }).current;

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (element.locked || !containerRef.current) return;

        const dx = e.clientX - interaction.startX;
        const dy = e.clientY - interaction.startY;
        
        if (interaction.type === 'drag') {
            onUpdate(element.id, { x: interaction.startXEl + dx, y: interaction.startYEl + dy });
        } else if (interaction.type === 'resize-br') {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Center of the element at the start of interaction
            const centerX = interaction.startXEl + interaction.startW / 2;
            const centerY = interaction.startYEl + interaction.startH / 2;

            // Vector from center to current mouse position
            const dxMouse = mouseX - centerX;
            const dyMouse = mouseY - centerY;

            // Distance from center to mouse
            const distance = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

            // The diagonal distance from the center to the corner of the un-rotated element
            // This is equivalent to the distance from center to corner of the rotated element.
            const cornerDist = Math.sqrt(Math.pow(interaction.startW / 2, 2) + Math.pow(interaction.startH / 2, 2));

            // If corner is at the center, avoid division by zero
            if (cornerDist === 0) return;

            const scaleFactor = distance / cornerDist;

            const newWidth = Math.max(20, interaction.startW * scaleFactor);
            const newHeight = newWidth / element.aspectRatio;

            // Recalculate position to keep the center fixed
            const newX = centerX - newWidth / 2;
            const newY = centerY - newHeight / 2;

            onUpdate(element.id, { width: newWidth, height: newHeight, x: newX, y: newY });
        }
    }, [element, onUpdate, containerRef, interaction]);

    const handleMouseUp = useCallback(() => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: 'drag' | 'resize-br') => {
        if (element.locked) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect(element.id);
        
        interaction.type = type;
        interaction.startX = e.clientX;
        interaction.startY = e.clientY;
        interaction.startW = element.width;
        interaction.startH = element.height;
        interaction.startXEl = element.x;
        interaction.startYEl = element.y;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };
    
    return (
        <div
            ref={ref}
            className={`absolute ${element.locked ? 'cursor-default' : 'cursor-move'}`}
            style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: disableRotation ? undefined : `rotate(${element.rotation}deg)`,
                visibility: element.visible ? 'visible' : 'hidden',
                outline: isSelected ? '2px solid #3b82f6' : 'none',
                userSelect: 'none',
                zIndex: zIndex
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            onClick={(e) => { e.stopPropagation(); onSelect(element.id);}}
        >
            <img src={element.src} alt="design element" className="w-full h-full pointer-events-none" loading="lazy" />
            {isSelected && !element.locked && (
                <>
                    <div
                        className="absolute -right-1 -bottom-1 w-4 h-4 bg-white border-2 border-brand-secondary rounded-full cursor-se-resize"
                        onMouseDown={(e) => handleMouseDown(e, 'resize-br')}
                    />
                </>
            )}
        </div>
    );
};

export default DraggableResizableImage;