

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppData, Product, BrandColor, PrintDesign, OrderDetail, CostDetails, CustomerInfo, EstimationParams, ProductPrice } from '../types';
import { ImagePreviewModal } from './ImagePreviewModal';
import { MetaTags } from './MetaTags';
import { Breadcrumbs } from './Breadcrumbs';
import { calculateCost } from '../services/costService';
import { StockGridModal } from './StockGridModal';

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

// --- Constants for Simulation from Reference ---
const SIMULATION_QUANTITIES = [10, 20, 30, 40, 50, 100, 200];
const SIMULATION_PATTERNS: { label: string; description: string, designs: PrintDesign[] }[] = [
  {
    label: '前面1色プリント',
    description: '最も一般的なプリントを行った場合の価格',
    designs: [{ id: 'sim_front_1', location: 'frontCenter', size: '10x10', colors: 1, specialInks: [], plateType: 'normal' }]
  },
  {
    label: '前後 各1色プリント',
    description: 'Tシャツの両面にプリントを行った場合の価格',
    designs: [
      { id: 'sim_front_1_b', location: 'frontCenter', size: '10x10', colors: 1, specialInks: [], plateType: 'normal' },
      { id: 'sim_back_1_b', location: 'backCenter', size: '10x10', colors: 1, specialInks: [], plateType: 'normal' }
    ]
  },
  {
    label: '前 1色、後2色プリント',
    description: 'Tシャツの両面にプリントを行った場合の価格',
    designs: [
        { id: 'sim_front_1_c', location: 'frontCenter', size: '10x10', colors: 1, specialInks: [], plateType: 'normal' },
        { id: 'sim_back_2_c', location: 'backCenter', size: '10x10', colors: 2, specialInks: [], plateType: 'normal' }
    ]
  },
];

const EMPTY_CUSTOMER_INFO: CustomerInfo = {
    companyName: '', nameKanji: '', nameKana: '', email: '', phone: '',
    zipCode: '', address1: '', address2: '', notes: '', quoteSubject: '',
    hasSeparateShippingAddress: false, shippingName: '', shippingPhone: '',
    shippingZipCode: '', shippingAddress1: '', shippingAddress2: '',
};


// --- Sub-components for better structure ---

const ImageSection: React.FC<{
  productName: string;
  selectedColor: BrandColor | null;
  mainImageUrl: string;
  imageThumbs: { type: string; color: BrandColor | null; url: string; }[];
  uiText: Record<string, string>;
  onImageClick: (index: number) => void;
  onColorSelect: (color: BrandColor) => void;
}> = ({ productName, selectedColor, mainImageUrl, imageThumbs, uiText, onImageClick, onColorSelect }) => {
    const mainImageBaseUrl = mainImageUrl.split('?')[0];

    return (
        <div className="grid grid-cols-[auto_1fr] gap-4">
            {/* Thumbnails (Left) */}
            <div className="w-16 flex-shrink-0 relative">
                <div className="absolute inset-0 overflow-y-auto pr-1">
                    <div className="flex flex-col gap-2">
                        {imageThumbs.map((thumb, index) => {
                            const isSelected = mainImageBaseUrl.endsWith(thumb.url);
                            return (
                                <button
                                  key={index}
                                  onClick={() => thumb.color ? onColorSelect(thumb.color) : onImageClick(index)}
                                  className={`w-full aspect-square flex-shrink-0 border-2 bg-background-subtle overflow-hidden transition-colors duration-200 focus:outline-none ${
                                    isSelected ? 'border-primary' : 'border-transparent hover:border-border-default'
                                  }`}
                                  aria-label={uiText['productDetail.image.thumbnail.alt']?.replace('{{index}}', (index + 1).toString())}
                                >
                                    <img src={getImageUrl(thumb.url, { w: 100, h: 100, fit: 'contain', q: 80 })} alt={`${productName} thumbnail ${index + 1}`} className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE_SRC; }}/>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Image (Right) */}
            <div className="">
                <button 
                    onClick={() => onImageClick(imageThumbs.findIndex(t => t.url === mainImageBaseUrl))}
                    className="aspect-square bg-background-subtle flex items-center justify-center w-full cursor-zoom-in group relative"
                    aria-label={uiText['productDetail.image.zoom.ariaLabel']}
                >
                    <img 
                      key={mainImageUrl}
                      src={mainImageUrl} 
                      alt={`${productName} - ${selectedColor?.name}`}
                      className="w-full h-full object-contain transition-opacity duration-300"
                      onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SRC; }}
                    />
                    <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 text-xs backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fas fa-search-plus mr-2"></i>{uiText['productDetail.image.zoom.tooltip']}
                    </div>
                </button>
            </div>
        </div>
    );
};

const ProductHeader: React.FC<{ product: Product; productName: string; productTags: string[]; uiText: Record<string, string> }> = ({ product, productName, productTags, uiText }) => (
  <div>
    <p className="text-sm text-text-secondary">{product.brand}</p>
    <h1 className="text-3xl font-bold text-text-heading">{productName}</h1>
    <p className="font-mono text-text-secondary mt-1">{uiText['productDetail.partNumber']?.replace('{{code}}', product.code)}</p>
    {productTags.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-4">
          {productTags.map(tagName => (
              <span key={tagName} className="bg-background-subtle text-text-secondary text-xs font-semibold px-3 py-1 border border-border-default">
                  {tagName}
              </span>
          ))}
      </div>
    )}
  </div>
);

const ColorSelector: React.FC<{
  productColors: BrandColor[];
  selectedColor: BrandColor | null;
  uiText: Record<string, string>;
  onColorSelect: (color: BrandColor) => void;
}> = ({ productColors, selectedColor, uiText, onColorSelect }) => (
  <div>
    <h2 className="text-lg font-semibold text-text-heading mb-2">{uiText['productDetail.color.title']}{selectedColor && (<span className="text-base font-normal">{uiText['productDetail.color.selectedPrefix']} {selectedColor.name}</span>)}</h2>
    <div className="flex flex-wrap gap-2">
      {productColors.map(color => (
        <button key={color.code} onClick={() => onColorSelect(color)} className={`w-8 h-8 border-2 transition-transform transform hover:scale-110 ${selectedColor?.code === color.code ? 'border-primary shadow-md' : 'border-border-default'}`} style={{ backgroundColor: color.hex }} title={color.name}></button>
      ))}
    </div>
  </div>
);

const PriceSimulation: React.FC<{ simulationMatrix: any[]; pricing: any; cheapestPriceInfo: any; cheapestColorForDisplay: any; uiText: Record<string, string> }> = ({ simulationMatrix, pricing, cheapestPriceInfo, cheapestColorForDisplay, uiText }) => {
    if (simulationMatrix.length === 0 || !cheapestPriceInfo || !cheapestColorForDisplay) return null;

    return (
        <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-text-heading mb-1">{uiText['productDetail.simulation.title']}</h2>
            <p className="text-xs text-text-secondary mb-3 space-y-1">
                <span>{uiText['productDetail.simulation.note1']}</span><br/>
                <span>{uiText['productDetail.simulation.note2']?.replace('{{price}}', (pricing.shippingFreeThreshold).toLocaleString())}</span><br/>
                <span>{uiText['productDetail.simulation.note3']?.replace('{{color}}', cheapestPriceInfo.color).replace('{{size}}', cheapestPriceInfo.size).replace('{{price}}', (cheapestPriceInfo.price).toLocaleString())}</span>
            </p>
            <div className="overflow-x-auto border border-border-default">
                <table className="w-full text-sm text-left min-w-[700px]">
                    <thead className="bg-background-subtle">
                        <tr>
                            <th className="sticky left-0 bg-background-subtle p-3 font-semibold text-text-secondary z-10 border-r w-36">{uiText['productDetail.simulation.table.header']}</th>
                            {SIMULATION_QUANTITIES.map(q => (
                                <th key={q} className="p-3 font-semibold text-text-secondary text-center w-20">{uiText['productDetail.simulation.table.quantity']?.replace('{{count}}', q.toString())}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-surface">
                        {simulationMatrix.map(row => (
                            <tr key={row.label} className="border-t">
                                <td className="sticky left-0 bg-surface p-3 z-10 border-r w-36">
                                    <p className="font-semibold text-text-heading">{row.label}</p>
                                    <p className="text-xs text-text-secondary">{row.description}</p>
                                </td>
                                {row.prices.map((price, index) => (
                                    <td key={index} className="p-3 text-center font-mono">
                                        {price > 0 ? `¥${price.toLocaleString()}` : '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-text-secondary mt-2">{uiText['productDetail.simulation.footer']}</p>
        </div>
    );
};

const InfoTabs: React.FC<{ product: Product; uiText: Record<string, string>; }> = 
({ product, uiText }) => {
  return (
    <div>
        <div className="border-b border-border-default">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button className="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm border-primary text-primary">
                    商品説明
                </button>
            </nav>
        </div>
        <div className="pt-6">
            <p className="text-text-primary leading-relaxed">{product.description}</p>
        </div>
    </div>
  );
};


export const ProductDetailPage: React.FC<{
  appData: AppData;
  productId: string;
  onNavigateToEstimator: (searchQuery: string) => void;
  onNavigateToSearchResults: (query: string) => void;
  onNavigateHome: () => void;
  onNavigateBack: () => void;
}> = ({ appData, productId, onNavigateToEstimator, onNavigateToSearchResults, onNavigateHome, onNavigateBack }) => {
  const allProducts = useMemo(() => Object.values(appData.products).flat(), [appData.products]);
  const product = useMemo(() => allProducts.find((p: Product) => p.id === productId), [allProducts, productId]);

  const [selectedColor, setSelectedColor] = useState<BrandColor | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // New state to manage the currently displayed main image.
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { uiText, tags, sizeOrder, pricing, colors: appColors } = appData;

  const productName = useMemo(() => {
    if (!product) return '';
    return [product.name, product.variantName].filter(Boolean).join(' ');
  }, [product]);

  const colorPalette = useMemo(() => product ? appColors[product.brand] || {} : {}, [product, appColors]);
  
  const productColors = useMemo(() => {
    if (!product) return [];
    const allColorsInPalette = Object.values(colorPalette);
    return product.colors
      .map(colorCode => allColorsInPalette.find((color: BrandColor) => color.code === colorCode))
      .filter((color): color is BrandColor => color !== undefined);
  }, [product, colorPalette]);

  const imageThumbs = useMemo(() => {
    if (!product) return [];
    const thumbs = [];
    // General Images
    for (let i = 1; i <= product.generalImageCount; i++) {
        thumbs.push({ type: 'general', color: null, url: `/images/products/${product.brand.replace(/\s+/g, '-').toLowerCase()}/${product.code}/general_${i}.jpg` });
    }
    // Color Images
    productColors.forEach(color => {
        thumbs.push({ type: 'color', color, url: `/images/products/${product.brand.replace(/\s+/g, '-').toLowerCase()}/${product.code}/color_${color.code}_front.jpg` });
    });
    return thumbs;
  }, [product, productColors]);

  useEffect(() => {
    if (productColors.length > 0 && !selectedColor) {
      const initialColor = productColors[0];
      setSelectedColor(initialColor);
      const initialIndex = imageThumbs.findIndex(t => t.color?.code === initialColor.code);
      if (initialIndex !== -1) setActiveImageIndex(initialIndex);
    }
  }, [productColors, selectedColor, imageThumbs]);

  const mainImageUrl = useMemo(() => {
    if (!product || imageThumbs.length === 0) return PLACEHOLDER_IMAGE_SRC;
    const url = imageThumbs[activeImageIndex]?.url || imageThumbs[0].url;
    return getImageUrl(url, { w: 800, h: 800, fit: 'contain', q: 90 });
  }, [product, imageThumbs, activeImageIndex]);


  const handleSelectColor = (color: BrandColor) => {
    setSelectedColor(color);
    const newIndex = imageThumbs.findIndex(t => t.color?.code === color.code);
    if (newIndex !== -1) {
      setActiveImageIndex(newIndex);
    }
  };

  const handleOpenPreview = (index: number) => {
    setActiveImageIndex(index); // Also update main image when a thumb is clicked
    setPreviewInitialIndex(index);
    setIsImagePreviewOpen(true);
  };

  const productTags = useMemo(() => {
    if (!product) return [];
    return product.tags
      .map(tagId => tags.find(t => t.tagId === tagId)?.tagName)
      .filter((name): name is string => !!name);
  }, [product, tags]);

  const cheapestPriceInfo = useMemo(() => {
    if (!product || product.prices.length === 0) return null;
    return product.prices.reduce((cheapest: ProductPrice, p: ProductPrice) => p.price < cheapest.price ? p : cheapest, product.prices[0]);
  }, [product]);

  const cheapestColorForDisplay = useMemo(() => {
    if (!cheapestPriceInfo) return null;
    return Object.values(colorPalette).find((c: BrandColor) => c.type === cheapestPriceInfo.color);
  }, [cheapestPriceInfo, colorPalette]);
  
  const simulationMatrix = useMemo(() => {
    if (!product || !cheapestPriceInfo) return [];
    const allProductsFlat = Object.values(appData.products).flat();

    return SIMULATION_PATTERNS.map(pattern => {
        const prices = SIMULATION_QUANTITIES.map(quantity => {
            const orderDetail: OrderDetail = {
                productId: product.id,
                productName: productName,
                color: cheapestColorForDisplay?.name || '',
                size: cheapestPriceInfo.size,
                quantity: quantity,
                unitPrice: cheapestPriceInfo.price,
            };
            const params: EstimationParams = {
                items: [orderDetail],
                printDesigns: pattern.designs,
            };
            // FIX: Explicitly cast allProductsFlat to Product[] to resolve type error.
            const cost = calculateCost(params, allProductsFlat as Product[], EMPTY_CUSTOMER_INFO, appData.pricing, appData.colors);
            return cost.costPerShirt;
        });
        return { label: pattern.label, description: pattern.description, prices };
    });
  }, [product, productName, cheapestPriceInfo, cheapestColorForDisplay, appData.products, appData.pricing, appData.colors]);

  const handleNavigateToEstimatorClick = () => {
    if (product) {
      const displayString = `${product.code} - ${productName}`;
      onNavigateToEstimator(displayString);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background-subtle flex flex-col pt-16">
        <main className="flex-grow container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-accent mb-4">{uiText['productDetail.error.title']}</h2>
          <p className="text-gray-700">{uiText['productDetail.error.message']}</p>
          <button onClick={onNavigateBack} className="mt-6 bg-primary text-white font-bold py-2 px-6 hover:bg-primary/90 transition">
            {uiText['productDetail.backButton']}
          </button>
        </main>
      </div>
    );
  }

  const modalImageUrls = imageThumbs.map(thumb => thumb.url);
  const modalImageAlts = imageThumbs.map((thumb, index) => {
      const baseAlt = `${productName}${thumb.color ? ` - ${thumb.color.name}` : ''}`;
      return `${baseAlt} - ${uiText['imagePreview.titleSuffix']?.replace('{{index}}', (index + 1).toString()) || `画像 ${index + 1}`}`;
  });

  return (
    <>
      <MetaTags 
          title={`${productName} | ${uiText['metadata.name']}`}
          description={product.description}
          canonicalUrl={`${appData.theme.site_base_url}/product/${product.id}`}
          imageUrl={`${appData.theme.site_base_url}${mainImageUrl.split('?')[0]}`}
      />
      <Breadcrumbs appData={appData} />
      <div className="bg-background">
        <div className="w-full max-w-screen-xl mx-auto px-4 pt-8 pb-12">
          {/* Mobile/Tablet Title */}
          <div className="lg:hidden mb-8">
            <ProductHeader product={product} productName={productName} productTags={productTags} uiText={uiText} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-12 gap-y-12 w-full mx-auto">
            {/* --- Image Section --- */}
            <div className="lg:sticky lg:top-24 self-start">
              <div className="md:w-1/2 md:mx-auto lg:w-full">
                <ImageSection
                    productName={productName}
                    selectedColor={selectedColor}
                    mainImageUrl={mainImageUrl}
                    imageThumbs={imageThumbs}
                    uiText={uiText}
                    onImageClick={handleOpenPreview}
                    onColorSelect={handleSelectColor}
                />
              </div>
            </div>
            
            {/* --- Details Section --- */}
            <div className="space-y-8">
              {/* Desktop Title */}
              <div className="hidden lg:block">
                  <ProductHeader product={product} productName={productName} productTags={productTags} uiText={uiText} />
              </div>
              <ColorSelector productColors={productColors} selectedColor={selectedColor} uiText={uiText} onColorSelect={handleSelectColor} />
              <div className="border-t pt-6">
                 <button
                    onClick={() => setIsStockModalOpen(true)}
                    className="w-full bg-surface border border-border-default text-text-primary font-bold py-3 px-6 hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all flex items-center justify-center"
                >
                    <i className="fas fa-table mr-3"></i>
                    全カラー・全サイズの在庫を一覧で見る
                </button>
              </div>
              <div className="border-t pt-6">
                 <button onClick={handleNavigateToEstimatorClick} className="w-full bg-primary text-white font-bold py-4 px-8 text-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark transition-transform transform hover:scale-105">
                     <i className="fas fa-calculator mr-3"></i>
                     {uiText['productDetail.estimatorButton']}
                 </button>
              </div>
              <PriceSimulation simulationMatrix={simulationMatrix} pricing={pricing} cheapestPriceInfo={cheapestPriceInfo} cheapestColorForDisplay={cheapestColorForDisplay} uiText={uiText} />
              <InfoTabs product={product} uiText={uiText} />
            </div>
          </div>
        </div>
      </div>
      {isImagePreviewOpen && (
          <ImagePreviewModal
              uiText={uiText}
              imageUrls={modalImageUrls}
              imageAlts={modalImageAlts}
              title={productName}
              initialIndex={previewInitialIndex}
              onClose={() => setIsImagePreviewOpen(false)}
          />
      )}
      {isStockModalOpen && (
        <StockGridModal
            product={product}
            allColors={appColors[product.brand]}
            allSizes={appData.sizes[product.brand]}
            stockData={appData.stock}
            sizeOrder={appData.sizeOrder}
            uiText={uiText}
            onClose={() => setIsStockModalOpen(false)}
        />
      )}
    </>
  );
};