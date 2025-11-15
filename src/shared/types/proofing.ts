// Proofing Tool Types
export interface DesignElement {
    id: string;
    type: 'image';
    src: string;
    originalSrc?: string;
    imageName?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    visible: boolean;
    aspectRatio: number;
    locked: boolean;
    googleDriveFileId?: string;
}

export interface ProductImageLayer {
    id: string;
    productId: string;
    colorName: string;
    imageSrc: string;
    visible: boolean;
    locked: boolean;
}

export interface CanvasState {
    id: string;
    name: string;
    quoteId: string | null;
    productImageLayers: ProductImageLayer[];
    layers: DesignElement[];
    viewType: 'front' | 'back' | 'other';
}

export interface ExportOptions {
    width: number;
    height: number;
    scale: number;
    format: 'jpeg' | 'png';
    background: 'white' | 'transparent';
    filename: string;
}

