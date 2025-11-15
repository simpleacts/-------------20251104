import { DesignElement, ExportOptions } from '@shared/types';

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image from URL: ${src}. This could be a CORS issue or the resource is unavailable.`));
        img.src = src;
    });
};

export const exportCanvasAsImage = async (
    designLayers: DesignElement[], 
    backgroundImageSrc: string | null,
    options: ExportOptions
): Promise<string> => {
    const { width, height, scale, format, background } = options;
    
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Canvasコンテキストの取得に失敗しました。');
    }

    // 背景の描画
    if (background === 'white') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 背景商品画像の描画
    if (backgroundImageSrc) {
        try {
            const bgImg = await loadImage(backgroundImageSrc);
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`背景画像の読み込みに失敗しました: ${backgroundImageSrc}`, errorMessage);
            // 背景がなくても処理を続行
        }
    }
    
    // デザインレイヤーを逆順（奥から）に描画
    const visibleLayers = [...designLayers].reverse().filter(layer => layer.visible);

    for (const layer of visibleLayers) {
        try {
            const img = await loadImage(layer.originalSrc || layer.src);
            
            ctx.save();
            
            const centerX = (layer.x + layer.width / 2) * scale;
            const centerY = (layer.y + layer.height / 2) * scale;
            
            ctx.translate(centerX, centerY);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
            
            ctx.drawImage(
                img,
                layer.x * scale,
                layer.y * scale,
                layer.width * scale,
                layer.height * scale
            );
            
            ctx.restore();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`レイヤー画像の読み込みに失敗しました: ${layer.originalSrc || layer.src}`, errorMessage);
        }
    }
    
    // 画像をData URLとして取得
    const mimeType = `image/${format}`;
    return canvas.toDataURL(mimeType, 0.95);
};