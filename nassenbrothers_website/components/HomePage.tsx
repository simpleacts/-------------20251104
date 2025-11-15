import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppData, Product, Category, GalleryImage, Article, Recommendation, HomePageProps } from '../types';
import { ProductCard } from './ProductCard';
import { ScrollToTopButton } from './ScrollToTopButton';
import { useRecommendations } from '../hooks/useRecommendations';

const PLACEHOLDER_IMAGE_SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHN0eWxlPSJmaWxsOiAjZmZmZmZmOyIvPjwvc3ZnPg==';

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

const HeroSection: React.FC<{ uiText: Record<string, string>; onNavigateToEstimator: () => void; }> = ({ uiText, onNavigateToEstimator }) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch('/templates/site_assets.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.heroVideos && data.heroVideos.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.heroVideos.length);
          setVideoSrc(data.heroVideos[randomIndex]);
        }
      })
      .catch(err => {
        console.error("Failed to load hero videos:", err);
        // Fallback to a default video if JSON fails
        setVideoSrc('./videos/background_1.mp4');
      });
  }, []);

  return (
    <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center text-center text-white overflow-hidden">
      {videoSrc && (
        <video
          key={videoSrc}
          className="absolute top-1/2 left-1/2 w-auto h-auto min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2 z-0"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
      <div className="absolute inset-0 bg-black/50 z-10"></div>
      <div className="relative z-20 p-4">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {uiText['home.hero.title']}
        </h1>
        <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {uiText['home.hero.subtitle']}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onNavigateToEstimator}
            className="bg-primary text-white font-bold py-3 px-8 text-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark transition-transform transform hover:scale-105"
          >
            {uiText['home.estimatorButton.text']}
          </button>
        </div>
      </div>
    </section>
  );
};

interface SearchSectionProps {
  appData: AppData;
  uiText: Record<string, string>;
  onNavigateToSearchResults: (query: string) => void;
  onNavigateToProductDetail: (productId: string) => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ appData, uiText, onNavigateToSearchResults, onNavigateToProductDetail }) => {
    const [query, setQuery] = useState('');
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    
    const allProducts = useMemo(() => Object.values(appData.products).flat(), [appData.products]);

    const getFullProductName = useCallback((product?: Product): string => {
        if (!product) return '';
        const nameParts = [product.name, product.variantName].filter(Boolean);
        return nameParts.join(' ');
    }, []);

    const searchResults = useMemo(() => {
        if (!query || !isSuggestionsVisible) return [];
        const normalizedQuery = katakanaToHiragana(toHalfWidth(query).toLowerCase()).trim();
        if (!normalizedQuery) return [];
        const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
        const { tags, categories } = appData;
        const tagMap = tags.reduce((acc, tag) => { acc[tag.tagId] = katakanaToHiragana(tag.tagName.toLowerCase()); return acc; }, {} as Record<string, string>);
        const categoryMap = categories.reduce((acc, cat) => { acc[cat.categoryId] = katakanaToHiragana(cat.categoryName.toLowerCase()); return acc; }, {} as Record<string, string>);

        return allProducts
            .filter(p => {
                return searchTerms.every(term => {
                    const fullProductName = katakanaToHiragana(getFullProductName(p).toLowerCase());
                    const code = p.code.toLowerCase();
                    const janCode = (p.jan_code || '').toLowerCase();
                    const productTagNames = p.tags.map(tagId => tagMap[tagId] || '').join(' ');
                    const productCategoryName = categoryMap[p.categoryId] || '';
                    const description = katakanaToHiragana((p.description || '').toLowerCase());
                    return fullProductName.includes(term) || code.includes(term) || janCode.includes(term) || productTagNames.includes(term) || productCategoryName.includes(term) || description.includes(term);
                });
            }).slice(0, 7);
    }, [query, isSuggestionsVisible, allProducts, appData.tags, appData.categories, getFullProductName]);
    
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
        onNavigateToSearchResults(query.trim());
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

    return (
        <section className="py-section-y-sm bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold text-center mb-6">{uiText['home.search.title']}</h2>
                <div className="max-w-xl mx-auto relative" ref={searchWrapperRef}>
                    <form onSubmit={handleSearchSubmit} className="flex items-center border border-border-default shadow-sm">
                        <input
                            type="search"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={() => setIsSuggestionsVisible(true)}
                            placeholder={uiText['home.search.placeholder']}
                            className="w-full p-4 border-0 focus:ring-0"
                            aria-label={uiText['home.search.ariaLabel']}
                            autoComplete="off"
                        />
                        <button type="submit" className="bg-primary text-white p-4 hover:bg-primary/90" aria-label={uiText['home.search.button.ariaLabel']}>
                            <i className="fas fa-search"></i>
                        </button>
                    </form>
                    {isSuggestionsVisible && query && (
                        <div className="absolute z-30 w-full bg-surface border border-border-default mt-1 max-h-96 overflow-y-auto shadow-lg">
                            {searchResults.length > 0 ? (
                                <ul>
                                    {searchResults.map(product => (
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
                                <div className="px-4 py-3 text-text-secondary">{uiText['home.suggestions.notFound']}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};


const CategorySection: React.FC<{ categories: Category[]; onNavigateToSearchResults: (query: string) => void; uiText: Record<string, string>; }> = ({ categories, onNavigateToSearchResults, uiText }) => (
    <section className="py-section-y-lg bg-background-subtle">
        <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">{uiText['home.category.title']}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {categories.map(category => (
                    <button
                        key={category.categoryId}
                        onClick={() => onNavigateToSearchResults(category.categoryName)}
                        className="bg-surface p-6 text-center border border-border-default shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group"
                    >
                        <i className={`fas ${category.icon || 'fa-tag'} text-3xl text-primary mb-3 transition-transform group-hover:scale-110`}></i>
                        <h3 className="font-bold text-text-heading">{category.categoryName}</h3>
                    </button>
                ))}
            </div>
        </div>
    </section>
);

const RecommendationSection: React.FC<{
    recommendation: Recommendation | null;
    isLoading: boolean;
    allProducts: Product[];
    appData: AppData;
    onNavigateToProductDetail: (id: string) => void;
}> = ({ recommendation, isLoading, allProducts, appData, onNavigateToProductDetail }) => {

    const recommendedProducts = useMemo(() => {
        if (!recommendation?.productIds) return [];
        return recommendation.productIds
            .map(id => allProducts.find(p => p.id === id))
            .filter((p): p is Product => !!p);
    }, [recommendation, allProducts]);

    if (isLoading) {
        return (
            <section className="py-section-y-lg bg-background">
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-t-transparent border-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-text-secondary">あなたへのおすすめ商品をAIが選んでいます...</p>
                </div>
            </section>
        );
    }
    
    if (!recommendation || recommendedProducts.length === 0) {
        return null; // Don't render the section if there are no recommendations
    }

    return (
        <section className="py-section-y-lg bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold text-center mb-2">{recommendation.title}</h2>
                <p className="text-text-secondary text-center mb-8 max-w-2xl mx-auto">{recommendation.reason}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {recommendedProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onSelect={() => onNavigateToProductDetail(product.id)}
                            allTags={appData.tags}
                            allColors={appData.colors}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};


const ArticleSection: React.FC<{ articles: Article[], onNavigateToArticle: (slug: string) => void, onNavigateToArticleList: () => void }> = ({ articles, onNavigateToArticle, onNavigateToArticleList }) => {
    const featuredArticles = useMemo(() => {
        return [...articles]
            .filter(a => a.is_published)
            .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
            .slice(0, 3);
    }, [articles]);

    return (
        <section className="py-section-y-lg bg-background-subtle">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold text-center mb-8">お役立ちコンテンツ</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {featuredArticles.map(article => (
                        <button
                            key={article.id}
                            onClick={() => onNavigateToArticle(article.slug)}
                            className="bg-surface border border-border-default text-left w-full transition-all transform hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex flex-col h-full group"
                        >
                            <div className="relative aspect-video bg-gray-100 overflow-hidden">
                                <img src={article.image_path} alt={article.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            </div>
                            <div className="p-6 flex-grow flex flex-col">
                                <h3 className="font-bold text-lg text-text-heading leading-tight flex-grow">{article.title}</h3>
                                <p className="text-xs text-text-secondary mt-4 pt-4 border-t border-border-default">{new Date(article.published_date).toLocaleDateString()}</p>
                            </div>
                        </button>
                    ))}
                </div>
                 <div className="text-center mt-12">
                    <button
                        onClick={onNavigateToArticleList}
                        className="bg-primary text-white font-bold py-3 px-8 text-base hover:bg-primary/90 transition-colors"
                    >
                        コンテンツ一覧を見る
                    </button>
                </div>
            </div>
        </section>
    );
};

export const HomePage: React.FC<HomePageProps> = ({ appData, onNavigateToEstimator, onNavigateToProductDetail, onNavigateToSearchResults, onNavigateToPrivacyPolicy, onNavigateToArticle, onNavigateToArticleList }) => {
  const { recommendation, isLoading } = useRecommendations(appData.products);
  const allProducts = useMemo(() => Object.values(appData.products).flat(), [appData.products]);
  
  return (
    <>
      <HeroSection
        uiText={appData.uiText}
        onNavigateToEstimator={() => onNavigateToEstimator()}
      />
      <main>
        <SearchSection
          appData={appData}
          uiText={appData.uiText}
          onNavigateToSearchResults={onNavigateToSearchResults}
          onNavigateToProductDetail={onNavigateToProductDetail}
        />
        <RecommendationSection
            recommendation={recommendation}
            isLoading={isLoading}
            allProducts={allProducts}
            appData={appData}
            onNavigateToProductDetail={onNavigateToProductDetail}
        />
        <CategorySection
          categories={appData.categories}
          onNavigateToSearchResults={onNavigateToSearchResults}
          uiText={appData.uiText}
        />
        <ArticleSection
          articles={appData.articles}
          onNavigateToArticle={onNavigateToArticle}
          onNavigateToArticleList={onNavigateToArticleList}
        />
      </main>
      <ScrollToTopButton uiText={appData.uiText} />
    </>
  );
};
export default HomePage;