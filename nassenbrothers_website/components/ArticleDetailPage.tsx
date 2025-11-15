import React, { useMemo } from 'react';
import { AppData, Article, Product } from '../types';
import { MetaTags } from './MetaTags';
import { StructuredData } from './StructuredData';
import { ProductCard } from './ProductCard'; // Assuming ProductCard is extracted

interface ArticleDetailPageProps {
  appData: AppData;
  slug: string;
  onNavigateToProductDetail: (productId: string) => void;
  onNavigateToArticle: (slug: string) => void;
}

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({ appData, slug, onNavigateToProductDetail, onNavigateToArticle }) => {
  const { articles, articleTags, products, tags: productTags, colors, theme, uiText } = appData;
  const allProducts = useMemo(() => Object.values(products).flat(), [products]);

  const article = useMemo(() => articles.find(a => a.slug === slug && a.is_published), [articles, slug]);

  const articleTagNames = useMemo(() => {
    if (!article) return [];
    return article.tags
      .map(tagId => articleTags.find(t => t.tagId === tagId)?.tagName)
      .filter((name): name is string => !!name);
  }, [article, articleTags]);

  const relatedProducts = useMemo(() => {
    if (!article) return [];
    const articleTagNamesLower = articleTagNames.map(t => t.toLowerCase());
    
    return allProducts
      .filter(product => 
        product.tags.some(tagId => {
          const tagName = productTags.find(t => t.tagId === tagId)?.tagName.toLowerCase();
          return tagName && articleTagNamesLower.includes(tagName);
        })
      )
      .slice(0, 5);
  }, [article, allProducts, productTags, articleTagNames]);

  const relatedArticles = useMemo(() => {
    if (!article) return [];
    return articles
      .filter(other => other.id !== article.id && other.is_published && other.tags.some(tag => article.tags.includes(tag)))
      .slice(0, 3);
  }, [article, articles]);

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
        <main className="flex-grow container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-accent mb-4">記事が見つかりません</h2>
          <p className="text-gray-700">お探しのページは存在しないか、移動した可能性があります。</p>
        </main>
      </div>
    );
  }
  
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${theme.site_base_url}/articles/${article.slug}`,
    },
    'headline': article.title,
    'image': `${theme.site_base_url}${article.image_path}`,
    'datePublished': article.published_date,
    'author': {
      '@type': 'Organization',
      'name': '捺染兄弟',
    },
    'publisher': {
      '@type': 'Organization',
      'name': '捺染兄弟',
      'logo': {
        '@type': 'ImageObject',
        'url': `${theme.site_base_url}/logo.png`,
      },
    },
    'description': article.excerpt,
  };

  return (
    <>
      <MetaTags 
        title={`${article.title} | 捺染兄弟`}
        description={article.excerpt}
        imageUrl={`${theme.site_base_url}${article.image_path}`}
        canonicalUrl={`${theme.site_base_url}/articles/${article.slug}`}
      />
      <StructuredData schema={articleSchema} />

      <main className="w-full max-w-screen-lg mx-auto px-4 pt-16 pb-12 bg-background">
        <article>
          <header className="mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {articleTagNames.map(tagName => (
                  <span key={tagName} className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1">
                      {tagName}
                  </span>
              ))}
            </div>
            <h1 className="text-4xl font-extrabold text-text-heading tracking-tight">{article.title}</h1>
            <p className="mt-4 text-lg text-text-secondary">{new Date(article.published_date).toLocaleDateString()}</p>
          </header>

          <div className="aspect-video bg-gray-100 mb-8">
            <img src={article.image_path} alt={article.title} className="w-full h-full object-cover" />
          </div>

          <div className="prose max-w-none text-text-primary text-lg">
            <p className="lead font-semibold">{article.excerpt}</p>
            <p>{article.content}</p>
          </div>
        </article>

        {relatedProducts.length > 0 && (
          <section className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold text-center text-text-heading mb-8">関連商品</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {relatedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => onNavigateToProductDetail(product.id)}
                  allTags={productTags}
                  allColors={colors}
                />
              ))}
            </div>
          </section>
        )}
        
        {relatedArticles.length > 0 && (
           <section className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold text-center text-text-heading mb-8">関連記事</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedArticles.map(related => (
                <button
                  key={related.id}
                  onClick={() => onNavigateToArticle(related.slug)}
                  className="bg-surface border border-border-default text-left w-full transition-all transform hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex flex-col h-full group"
                >
                    <div className="relative aspect-video bg-gray-100 overflow-hidden">
                        <img 
                            src={related.image_path} 
                            alt={related.title} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />
                    </div>
                    <div className="p-4 flex-grow flex flex-col">
                        <h3 className="font-bold text-text-heading leading-tight flex-grow">{related.title}</h3>
                        <p className="text-xs text-text-secondary mt-2">{new Date(related.published_date).toLocaleDateString()}</p>
                    </div>
                </button>
              ))}
            </div>
          </section>
        )}

      </main>
    </>
  );
};