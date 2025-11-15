import { Row } from './common';

// --- Blog & SEO Types ---
export interface ProductDetail extends Row {
    product_id: string;
    name: string;
    description: string;
    images?: string;
    meta_title?: string;
    meta_description?: string;
    og_image_url?: string;
    og_title?: string;
    og_description?: string;
}

// Fix: Add missing GalleryImage type to resolve import error.
export interface GalleryImage extends Row {
    id: string;
    url: string;
    title?: string;
    description?: string;
    tag_ids?: string;
}

