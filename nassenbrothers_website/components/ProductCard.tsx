import React, { useMemo } from 'react';
import { Product, Tag, AppData, BrandColor } from '../types';

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

export const ProductCard: React.FC<{ product: Product; onSelect: () => void; allTags: Tag[]; allColors: AppData['colors'] }> = ({ product, onSelect, allTags, allColors }) => {
  const productTags = useMemo(() => {
    return product.tags
      .map(tagId => allTags.find(t => t.tagId === tagId)?.tagName)
      .filter((name): name is string => !!name);
  }, [product.tags, allTags]);

  const getFullProductName = (p: Product): string => {
      const nameParts = [p.name, p.variantName].filter(Boolean);
      return nameParts.join(' ');
  };
  
  const mainImageUrl = useMemo(() => {
      const brandPath = product.brand.replace(/\s+/g, '-').toLowerCase();
      
      if (product.generalImageCount > 0) {
        const basePath = `/images/products/${brandPath}/${product.code}/general_1.jpg`;
        return getImageUrl(basePath, { w: 400, h: 400, fit: 'contain', q: 80 });
      }

      const brandColors = allColors[product.brand] || {};
      if (product.colors.length > 0) {
          const firstColorCode = product.colors[0];
          // FIX: Added explicit type for 'c' to resolve property access errors on 'unknown'.
          const firstColor = Object.values(brandColors).find((c: BrandColor) => c.code === firstColorCode);
          if (firstColor) {
              const basePath = `/images/products/${brandPath}/${product.code}/color_${firstColor.code}_front.jpg`;
              return getImageUrl(basePath, { w: 400, h: 400, fit: 'contain', q: 80 });
          }
      }

      return '';
  }, [product, allColors]);

  return (
    <button
      onClick={onSelect}
      className="bg-white border border-gray-200 p-4 text-left w-full transition-all transform hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex flex-col h-full"
    >
      <div className="relative mb-4">
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          <img 
            src={mainImageUrl} 
            alt={getFullProductName(product)} 
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
                e.currentTarget.onerror = null; 
                e.currentTarget.src = PLACEHOLDER_IMAGE_SRC;
            }}
          />
        </div>
        {productTags.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {productTags.slice(0, 3).map(tagName => (
              <span key={tagName} className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 backdrop-blur-sm">
                {tagName}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex-grow flex flex-col">
        <p className="text-xs text-gray-500 font-mono">{product.brand} / {product.code}</p>
        <h3 className="font-bold text-gray-800 leading-tight h-12 overflow-hidden">{getFullProductName(product)}</h3>
      </div>

      <p className="text-xs text-secondary font-semibold self-end mt-auto pt-2 border-t border-gray-100 w-full text-right">
        詳細・見積もりへ <i className="fas fa-arrow-right ml-1"></i>
      </p>
    </button>
  );
};