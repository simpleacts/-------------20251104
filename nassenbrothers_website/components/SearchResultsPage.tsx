import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppData, Product } from '../types';
import { ProductCard } from './ProductCard';
import { MetaTags } from './MetaTags';
import { Breadcrumbs } from './Breadcrumbs';

const PLACEHOLDER_IMAGE_SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHN0eWxlPSJmaWxsOiAjZmZmZmZmOyIvPjwvc3ZnPg==';

// Helper functions for Japanese-aware search
const toHalfWidth = (str: string): string => {
  if (!str) return '';
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
};

const katakanaToHiragana = (str: string): string => {
  if (!str) return '';
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const charCode = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(charCode);
  });
};


export const SearchResultsPage: React.FC<{
  appData: AppData;
  initialQuery: string;
  onNavigateToProductDetail: (productId: string) => void;
  onNavigateHome: () => void;
}> = ({ appData, initialQuery, onNavigateToProductDetail, onNavigateHome }) => {
  const allProducts = useMemo(() => Object.values(appData.products).flat(), [appData.products]);
  const [query, setQuery] = useState(initialQuery);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(initialQuery);
    // Reset filters on new search query
    setActiveBrand(null);
    setActiveCategoryId(null);
    setActiveTagId(null);
  }, [initialQuery]);

  const brands = useMemo(() => [...new Set(allProducts.map(p => p.brand))].sort(), [allProducts]);
  
  const handleResetFilters = () => {
    setActiveBrand(null);
    setActiveCategoryId(null);
    setActiveTagId(null);
  };
  
  const isFilterActive = !!activeBrand || !!activeCategoryId || !!activeTagId;

  const getFullProductName = useCallback((product?: Product): string => {
    if (!product) return '';
    const nameParts = [product.name, product.variantName].filter(Boolean);
    return nameParts.join(' ');
  }, []);
  
  const displayedProducts = useMemo(() => {
    let results;
    
    // If any filter is active, start from all products and ignore initialQuery
    if (isFilterActive) {
        results = allProducts;
    } else {
        // No filters are active, so perform keyword search if initialQuery exists
        const normalizedQuery = katakanaToHiragana(toHalfWidth(initialQuery).toLowerCase()).trim();
        if (normalizedQuery) {
            const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
            const { tags, categories } = appData;
            const tagMap = tags.reduce((acc, tag) => { acc[tag.tagId] = katakanaToHiragana(tag.tagName.toLowerCase()); return acc; }, {} as Record<string, string>);
            const categoryMap = categories.reduce((acc, cat) => { acc[cat.categoryId] = katakanaToHiragana(cat.categoryName.toLowerCase()); return acc; }, {} as Record<string, string>);

            results = allProducts.filter(p => {
                return searchTerms.every(term => {
                    const fullProductName = katakanaToHiragana(getFullProductName(p).toLowerCase());
                    const code = p.code.toLowerCase();
                    const janCode = (p.jan_code || '').toLowerCase();
                    const productTagNames = p.tags.map(tagId => tagMap[tagId] || '').join(' ');
                    const productCategoryName = categoryMap[p.categoryId] || '';
                    const description = katakanaToHiragana((p.description || '').toLowerCase());
                    return fullProductName.includes(term) || code.includes(term) || janCode.includes(term) || productTagNames.includes(term) || productCategoryName.includes(term) || description.includes(term);
                });
            });
        } else {
            // No filters and no query, show all products
            results = allProducts;
        }
    }

    // Apply filters to the determined result set
    if (activeBrand) {
        results = results.filter(p => p.brand === activeBrand);
    }
    if (activeCategoryId) {
        results = results.filter(p => p.categoryId === activeCategoryId);
    }
    if (activeTagId) {
        results = results.filter(p => p.tags.includes(activeTagId));
    }

    return results;
  }, [initialQuery, allProducts, appData.tags, appData.categories, getFullProductName, activeBrand, activeCategoryId, activeTagId]);


  const suggestionResults = useMemo(() => {
    if (!query || !isSuggestionsVisible) return [];
    const normalizedQuery = katakanaToHiragana(toHalfWidth(query).toLowerCase()).trim();
    if (!normalizedQuery) return [];
    const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
    
    return allProducts.filter(p => {
      return searchTerms.every(term => {
        const fullProductName = katakanaToHiragana(getFullProductName(p).toLowerCase());
        const code = p.code.toLowerCase();
        return fullProductName.includes(term) || code.includes(term);
      });
    }).slice(0, 7);
  }, [query, isSuggestionsVisible, allProducts, getFullProductName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
            setIsSuggestionsVisible(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsSuggestionsVisible(false);
      navigate(`/search/${encodeURIComponent(query.trim())}`);
    }
  };
  
  const handleSuggestionClick = (productId: string) => {
    setIsSuggestionsVisible(false);
    onNavigateToProductDetail(productId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isSuggestionsVisible) {
        setIsSuggestionsVisible(true);
    }
  };
  
  const headingText = useMemo(() => {
    if (isFilterActive) {
        const parts = [];
        if (activeBrand) parts.push(`ブランド: 「${activeBrand}」`);
        if (activeCategoryId) parts.push(`カテゴリ: 「${appData.categories.find(c => c.categoryId === activeCategoryId)?.categoryName}」`);
        if (activeTagId) parts.push(`タグ: 「${appData.tags.find(t => t.tagId === activeTagId)?.tagName}」`);
        return `絞り込み結果: ${parts.join(' ')}`;
    }
    if (initialQuery) {
        return `検索結果: 「${initialQuery}」`;
    }
    return '商品一覧';
  }, [initialQuery, isFilterActive, activeBrand, activeCategoryId, activeTagId, appData.categories, appData.tags]);

  const metaTitle = useMemo(() => {
    if (isFilterActive) {
        const parts = [];
        if (activeBrand) parts.push(activeBrand);
        if (activeCategoryId) parts.push(appData.categories.find(c => c.categoryId === activeCategoryId)?.categoryName);
        if (activeTagId) parts.push(appData.tags.find(t => t.tagId === activeTagId)?.tagName);
        return `${parts.join('・')} の商品一覧 | ${appData.uiText['metadata.name']}`;
    }
    if (initialQuery) {
         return `「${initialQuery}」の検索結果 | ${appData.uiText['metadata.name']}`;
    }
    return `商品一覧 | ${appData.uiText['metadata.name']}`;
  }, [initialQuery, isFilterActive, activeBrand, activeCategoryId, activeTagId, appData.categories, appData.tags, appData.uiText]);


  return (
    <>
      <MetaTags
        title={metaTitle}
        description={`「${initialQuery}」の検索結果ページです。`}
        canonicalUrl={`${appData.theme.site_base_url}/search/${encodeURIComponent(initialQuery)}`}
      />
      <Breadcrumbs appData={appData} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-4">商品検索</h1>
             <div className="max-w-xl mx-auto relative" ref={searchWrapperRef}>
                <form onSubmit={handleSearchSubmit} className="flex items-center border border-border-default shadow-sm bg-white">
                    <input
                        type="search"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => setIsSuggestionsVisible(true)}
                        placeholder="キーワードで再度検索..."
                        className="w-full p-3 border-0 focus:ring-0 text-base"
                        aria-label="商品を再検索"
                        autoComplete="off"
                    />
                    <button type="submit" className="bg-primary text-white p-3 hover:bg-primary/90 transition-colors" aria-label="検索">
                        <i className="fas fa-search"></i>
                    </button>
                </form>
                 {isSuggestionsVisible && query && (
                    <div className="absolute z-30 w-full bg-surface border border-border-default mt-1 max-h-96 overflow-y-auto shadow-lg">
                        {suggestionResults.length > 0 ? (
                            <ul>
                                {suggestionResults.map(product => (
                                    <li key={product.id}>
                                        <button 
                                            type="button" 
                                            onClick={() => handleSuggestionClick(product.id)}
                                            className="w-full text-left px-4 py-3 cursor-pointer hover:bg-secondary/10 flex items-center gap-4"
                                        >
                                            <img 
                                                src={`/images/products/${product.brand.replace(/\s+/g, '-').toLowerCase()}/${product.code}/general_1.jpg`} 
                                                alt={getFullProductName(product)} 
                                                className="w-12 h-12 object-contain bg-gray-100" 
                                                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_SRC; }}
                                            />
                                            <div>
                                                <p className="font-semibold text-text-heading">{getFullProductName(product)}</p>
                                                <p className="text-sm text-text-secondary">{product.code} - {product.brand}</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                                <li className="p-2 text-center border-t">
                                    <button type="button" onClick={handleSearchSubmit} className="text-sm text-secondary hover:underline">
                                        「{query}」の検索結果をすべて見る
                                    </button>
                                </li>
                            </ul>
                        ) : (
                            <div className="px-4 py-3 text-text-secondary">{appData.uiText['home.suggestions.notFound']}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex items-center my-6">
            <div className="flex-grow border-t border-border-default"></div>
            <span className="flex-shrink mx-4 text-text-secondary">または</span>
            <div className="flex-grow border-t border-border-default"></div>
        </div>

        <div className="mb-8 p-4 bg-background-subtle border border-border-default">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-text-primary">絞り込み</h3>
                {isFilterActive && (
                    <button onClick={handleResetFilters} className="text-sm text-accent hover:underline">
                        <i className="fas fa-times mr-1"></i>リセット
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="brand-filter" className="block text-xs font-medium text-text-secondary mb-1">ブランド</label>
                    <select id="brand-filter" value={activeBrand || ''} onChange={(e) => setActiveBrand(e.target.value || null)} className="w-full p-2 border border-border-default text-sm focus:ring-secondary focus:border-secondary">
                        <option value="">すべてのブランド</option>
                        {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="category-filter" className="block text-xs font-medium text-text-secondary mb-1">カテゴリ</label>
                    <select id="category-filter" value={activeCategoryId || ''} onChange={(e) => setActiveCategoryId(e.target.value || null)} className="w-full p-2 border border-border-default text-sm focus:ring-secondary focus:border-secondary">
                        <option value="">すべてのカテゴリ</option>
                        {appData.categories.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>)}
                    </select>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border-default/50">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-text-secondary mr-2">タグ:</span>
                    <button
                        onClick={() => setActiveTagId(null)}
                        className={`px-3 py-1 text-xs font-semibold transition-colors ${!activeTagId ? 'bg-primary text-white shadow' : 'bg-surface border border-border-default text-text-primary hover:bg-gray-100'}`}
                    >
                        すべて
                    </button>
                    {appData.tags.map(tag => (
                        <button
                            key={tag.tagId}
                            onClick={() => setActiveTagId(tag.tagId)}
                            className={`px-3 py-1 text-xs font-semibold transition-colors ${activeTagId === tag.tagId ? 'bg-primary text-white shadow' : 'bg-surface border border-border-default text-text-primary hover:bg-gray-100'}`}
                        >
                            {tag.tagName}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <h2 className="text-xl font-bold">{headingText}</h2>
        <p className="text-gray-600 mt-1 mb-6">{displayedProducts.length}件の商品が見つかりました</p>

        {displayedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {displayedProducts.map(product => (
                <ProductCard
                key={product.id}
                product={product}
                onSelect={() => onNavigateToProductDetail(product.id)}
                allTags={appData.tags}
                allColors={appData.colors}
                />
            ))}
            </div>
        ) : (
            <div className="text-center py-16 bg-background-subtle">
                <i className="fas fa-search text-5xl text-gray-400 mb-4"></i>
                <h3 className="text-xl font-semibold text-gray-700">商品が見つかりませんでした</h3>
                <p className="text-gray-500 mt-2">別のキーワードや絞り込み条件でお試しください。</p>
                 <button onClick={onNavigateHome} className="mt-6 bg-primary text-white font-bold py-2 px-6">
                    ホームに戻る
                </button>
            </div>
        )}
      </main>
    </>
  );
};