import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GalleryImage, GalleryTag, AppData } from '../types';
import { ImagePreviewModal } from './ImagePreviewModal';

const PLACEHOLDER_IMAGE_SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHN0eWxlPSJmaWxsOiAjZmZmZmZmOyIvPjwvc3ZnPg==';

const getImageUrl = (basePath: string, options: { w?: number; h?: number; q?: number; fit?: 'contain' | 'cover' }): string => {
  if (!basePath.includes('.jpg') && !basePath.includes('.png') && !basePath.includes('.gif')) { // Don't process non-images
    return basePath;
  }
  const params = new URLSearchParams();
  if (options.w) params.set('w', String(options.w));
  if (options.h) params.set('h', String(options.h));
  if (options.q) params.set('q', String(options.q));
  if (options.fit) params.set('fit', options.fit);
  const paramString = params.toString();
  return paramString ? `${basePath}?${paramString}` : basePath;
};

interface GalleryDetailPageProps {
  appData: AppData;
  galleryImageId: string;
  onNavigateBack: () => void;
}

export const GalleryDetailPage: React.FC<GalleryDetailPageProps> = ({ appData, galleryImageId, onNavigateBack }) => {
  const { galleryImages, galleryTags, uiText } = appData;
  const [galleryItem, setGalleryItem] = useState<GalleryImage | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  useEffect(() => {
    const foundItem = galleryImages.find(item => item.id === galleryImageId && item.is_published);
    setGalleryItem(foundItem || null);
    if (foundItem) {
      const initialImageUrl = `./images/gallery/${foundItem.id}/1.jpg`;
      setSelectedImageUrl(getImageUrl(initialImageUrl, { w: 800, h: 800, fit: 'contain', q: 90 }));
    }
  }, [galleryImageId, galleryImages]);

  const thumbnailUrls = useMemo(() => {
    if (!galleryItem || galleryItem.imageCount <= 0) return [];
    return Array.from({ length: galleryItem.imageCount }, (_, i) => 
      `./images/gallery/${galleryItem.id}/${i + 1}.jpg`
    );
  }, [galleryItem]);

  const itemTags = useMemo(() => {
    if (!galleryItem) return [];
    return galleryItem.tags
      .map(tagId => galleryTags.find(t => t.tagId === tagId)?.tagName)
      .filter((name): name is string => !!name);
  }, [galleryItem, galleryTags]);

  const handleThumbnailClick = (baseUrl: string) => {
    const mainImageUrl = getImageUrl(baseUrl, { w: 800, h: 800, fit: 'contain', q: 90 });
    const img = new Image();
    img.src = mainImageUrl;
    img.onload = () => setSelectedImageUrl(mainImageUrl);
    img.onerror = () => console.warn(`Image not found: ${mainImageUrl}`);
  };

  const modalImageUrls = useMemo(() => {
    if (!galleryItem) return [];
    return Array.from({ length: galleryItem.imageCount }, (_, i) => `./images/gallery/${galleryItem.id}/${i + 1}.jpg`);
  }, [galleryItem]);

  const modalImageAlts = useMemo(() => {
    if (!galleryItem) return [];
    return Array.from({ length: galleryItem.imageCount }, (_, i) => `${galleryItem.title} - ${uiText['imagePreview.titleSuffix']?.replace('{{index}}', (i + 1).toString())}`);
  }, [galleryItem, uiText]);

  const modalInitialIndex = useMemo(() => {
    if (!selectedImageUrl) return 0;
    const baseUrl = selectedImageUrl.split('?')[0];
    const index = modalImageUrls.indexOf(baseUrl);
    return index > -1 ? index : 0;
  }, [selectedImageUrl, modalImageUrls]);


  if (!galleryItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
        <main className="flex-grow container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{uiText['galleryDetail.error.title']}</h2>
          <p className="text-gray-700">{uiText['galleryDetail.error.message']}</p>
          <button onClick={onNavigateBack} className="mt-6 bg-black text-white font-bold py-2 px-6 hover:bg-gray-800 transition">
            {uiText['galleryDetail.error.button']}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-white pt-16">
      <main className="w-full max-w-screen-xl mx-auto px-4 pb-8">
        <div className="mb-6">
          <button onClick={onNavigateBack} className="text-gray-600 hover:text-black font-semibold transition-colors flex items-center">
            <i className="fas fa-arrow-left mr-2"></i>
            {uiText['galleryDetail.backButton']}
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-10 lg:gap-x-12 gap-y-12 w-full mx-auto">
          {/* --- Image Section --- */}
          <div className="lg:col-span-4 w-full md:w-[70%] lg:w-full mx-auto">
            <button 
                onClick={() => selectedImageUrl && setIsImagePreviewOpen(true)}
                className="aspect-square bg-gray-100 flex items-center justify-center mb-4 w-full cursor-zoom-in group relative"
                aria-label={uiText['productDetail.image.zoom.ariaLabel']}
            >
              <img 
                key={selectedImageUrl}
                src={selectedImageUrl} 
                alt={`${galleryItem.title} の画像`} 
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SRC; }}
              />
              <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 text-xs backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fas fa-search-plus mr-2"></i>{uiText['productDetail.image.zoom.tooltip']}
              </div>
            </button>

            <div className="flex overflow-x-auto space-x-2 pb-2 md:grid md:grid-cols-5 md:gap-2 md:space-x-0 md:pb-0">
              {thumbnailUrls.map((baseUrl, index) => {
                const thumbUrl = getImageUrl(baseUrl, { w: 100, h: 100, fit: 'cover', q: 85 });
                const mainUrlWithoutParams = selectedImageUrl.split('?')[0];
                return (
                    <button
                        key={index}
                        onClick={() => handleThumbnailClick(baseUrl)}
                        className={`flex-shrink-0 w-1/5 md:w-full aspect-square border-2 bg-gray-100 overflow-hidden transition-colors duration-200 focus:outline-none
                                    ${mainUrlWithoutParams === baseUrl ? 'border-black' : 'border-transparent hover:border-gray-400'}`}
                    >
                        <img 
                        src={thumbUrl} 
                        alt={`実績サムネイル ${index + 1}`} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SRC; }}
                        />
                    </button>
                );
              })}
            </div>
          </div>
          
          {/* --- Details Section --- */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex-grow space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{galleryItem.title}</h1>
                <p className="text-lg text-gray-400 font-mono mt-1">{uiText['galleryDetail.id']?.replace('{{id}}', galleryItem.id)}</p>
              </div>
              
              {itemTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                      {itemTags.map(tagName => (
                          <span key={tagName} className="bg-black text-white text-xs font-semibold px-3 py-1">
                              {tagName}
                          </span>
                      ))}
                  </div>
              )}
              
              {galleryItem.description && (
                  <div className="prose max-w-none text-gray-600">
                      <p>{galleryItem.description}</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {isImagePreviewOpen && selectedImageUrl && galleryItem && (
        <ImagePreviewModal
            uiText={uiText}
            imageUrls={modalImageUrls}
            imageAlts={modalImageAlts}
            title={galleryItem.title}
            initialIndex={modalInitialIndex}
            onClose={() => setIsImagePreviewOpen(false)}
        />
      )}
    </div>
  );
};