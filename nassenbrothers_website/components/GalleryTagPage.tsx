import React, { useMemo } from 'react';
import { AppData, GalleryImage, GalleryTag } from '../types';
import { ScrollToTopButton } from './ScrollToTopButton';
import { MetaTags } from './MetaTags';

interface GalleryTagPageProps {
  appData: AppData;
  tagId: string;
  onNavigateToDetail: (galleryId: string) => void;
}

const PLACEHOLDER_IMAGE_SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHN0eWxlPSJmaWxsOiAjZmZmZmZmOyIvPjwvc3ZnPg==';

const getImageUrl = (basePath: string, options: { w?: number; h?: number; q?: number; fit?: 'contain' | 'cover' }): string => {
  if (!basePath.includes('.jpg') && !basePath.includes('.png') && !basePath.includes('.gif')) {
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
            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SRC; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-3 text-white">
          <h3 className="font-bold leading-tight">{image.title}</h3>
        </div>
      </div>
    </button>
  );
};


export const GalleryTagPage: React.FC<GalleryTagPageProps> = ({ appData, tagId, onNavigateToDetail }) => {
  const { galleryImages, galleryTags, uiText, theme } = appData;
  
  const activeTag = useMemo(() => galleryTags.find(t => t.tagId === tagId), [galleryTags, tagId]);
  
  const displayedImages = useMemo(() => {
    if (!activeTag) return [];
    return galleryImages.filter(p => p.is_published && p.tags.includes(tagId));
  }, [galleryImages, tagId, activeTag]);

  const pageTitle = activeTag ? `タグ: ${activeTag.tagName}` : 'タグのギャラリー一覧';
  const pageDescription = activeTag ? `${activeTag.tagName}に関連するギャラリーの一覧です。` : 'ギャラリーをタグで絞り込んでいます。';
  const canonicalUrl = `${theme.site_base_url}/gallery/tags/${tagId}`;

  if (!activeTag) {
    return <div className="p-8 text-center">指定されたタグは存在しません。</div>
  }

  return (
    <>
      <MetaTags title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} />
      <main className="flex-grow w-full max-w-screen-xl mx-auto px-4 pt-16 pb-8">
        <div className="border-b border-gray-200 pb-4 mb-8">
            <h1 className="text-3xl font-bold text-black">{pageTitle}</h1>
            <p className="text-lg text-gray-600 mt-1">{pageDescription}</p>
        </div>
        
        {displayedImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {displayedImages.map(image => (
              <GalleryCard 
                key={image.id}
                image={image}
                onSelect={() => onNavigateToDetail(image.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <i className="fas fa-images text-5xl text-gray-400 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700">実績が見つかりませんでした</h3>
            <p className="text-gray-500 mt-2">このタグに関連する実績はまだありません。</p>
          </div>
        )}
      </main>
      <ScrollToTopButton uiText={uiText} />
    </>
  );
};
