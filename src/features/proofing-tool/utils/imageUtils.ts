

const MAX_PREVIEW_DIMENSION = 1200;

/**
 * 画像データURLを受け取り、プレビュー用にリサイズされた新しいデータURLを返す関数
 * @param imageDataUrl リサイズする画像のデータURL
 * @returns リサイズされた画像のデータURLを含むPromise
 */
const resizeImage = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const { width, height } = img;

            // 画像が最大サイズより小さい場合はリサイズ不要
            if (width <= MAX_PREVIEW_DIMENSION && height <= MAX_PREVIEW_DIMENSION) {
                resolve(imageDataUrl);
                return;
            }

            let newWidth, newHeight;
            if (width > height) {
                newWidth = MAX_PREVIEW_DIMENSION;
                newHeight = (height * MAX_PREVIEW_DIMENSION) / width;
            } else {
                newHeight = MAX_PREVIEW_DIMENSION;
                newWidth = (width * MAX_PREVIEW_DIMENSION) / height;
            }

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // 元の画像形式を維持しようと試みる (例: image/jpeg, image/png)
            const mimeType = imageDataUrl.match(/^data:(image\/.*?);/)?.[1] || 'image/png';
            resolve(canvas.toDataURL(mimeType, 0.9)); // JPEGの場合は品質を指定 (0.9 = 90%)
        };
        img.onerror = (error) => reject(error);
        img.src = imageDataUrl;
    });
};

export default resizeImage;