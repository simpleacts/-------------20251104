import React, { useState, useMemo } from 'react';
import { GalleryImage, GalleryTag, AppData } from '../types';
import { ScrollToTopButton } from './ScrollToTopButton';

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

interface GalleryPageProps {
  appData: AppData;
  onNavigateToGalleryDetail: (galleryId: string) => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ appData, onNavigateToGalleryDetail }) => {
  const { galleryImages: images, galleryTags, uiText } = appData;
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  
  const tags = useMemo(() => {
    return [...galleryTags].sort((a, b) => a.tagName.localeCompare(b.tagName));
  }, [galleryTags]);
  
  const displayedImages = useMemo(() => {
    const publishedImages = images.filter(p => p.is_published);
    if (!activeTagId) {
      return publishedImages;
    }
    return publishedImages.filter(p => p.tags.includes(activeTagId));
  }, [images, activeTagId]);

  return (
    <>
      <main className="flex-grow w-full max-w-screen-2xl mx-auto px-4 pt-16 pb-8">
        <div className="border-b border-gray-200 pb-4 mb-8">
            <h1 className="text-3xl font-bold text-black">
                {uiText['gallery.title']}
            </h1>
            <p className="text-lg text-gray-600 mt-1">{uiText['gallery.subtitle']}</p>
        </div>

        <div className="mb-8 p-4 bg-white border border-gray-200">
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-gray-600 mr-2">{uiText['gallery.filter.label']}</span>
                <button
                    onClick={() => setActiveTagId(null)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${!activeTagId ? 'bg-black text-white shadow' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                >
                    {uiText['gallery.filter.all']}
                </button>
                {tags.map(tag => (
                    <button
                        key={tag.tagId}
                        onClick={() => setActiveTagId(tag.tagId)}
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTagId === tag.tagId ? 'bg-black text-white shadow' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                        {tag.tagName}
                    </button>
                ))}
            </div>
        </div>
        
        {displayedImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {displayedImages.map(image => (
              <GalleryCard 
                key={image.id}
                image={image}
                onSelect={() => onNavigateToGalleryDetail(image.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <i className="fas fa-images text-5xl text-gray-400 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700">{uiText['gallery.empty.title']}</h3>
            <p className="text-gray-500 mt-2">{uiText['gallery.empty.message']}</p>
          </div>
        )}
      </main>
      <ScrollToTopButton uiText={uiText} />
    </>
  );
};

const GalleryCard: React.FC<{ image: GalleryImage; onSelect: () => void; }> = ({ image, onSelect }) => {
  const mainImageUrl = getImageUrl(`./images/gallery/${image.id}/1.jpg`, { w: 400, h: 400, fit: 'cover', q: 80 });
  
  return (
    <button
      onClick={onSelect}
      className="bg-white border border-gray-200 text-left w-full transition-all transform hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black group overflow-hidden"
    >
      <div className="aspect-square bg-gray-100 relative">
        <img 
            src={mainImageUrl} 
            alt={image.title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            loading="lazy"
            onError={(e) => {
                e.currentTarget.onerror = null; 
                e.currentTarget.src = PLACEHOLDER_IMAGE_SRC;
            }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-3 text-white">
          <h3 className="font-bold leading-tight">{image.title}</h3>
        </div>
      </div>
    </button>
  );
};