import React, { useState, useMemo } from 'react';
import { AppData, Article, ArticleTag } from '../types';
import { ScrollToTopButton } from './ScrollToTopButton';

interface ArticleListPageProps {
  appData: AppData;
  onNavigateToDetail: (slug: string) => void;
}

const ArticleCard: React.FC<{ article: Article, onClick: () => void, tags: ArticleTag[] }> = ({ article, onClick, tags }) => {
  const articleTags = useMemo(() => {
    return article.tags
      .map(tagId => tags.find(t => t.tagId === tagId)?.tagName)
      .filter((name): name is string => !!name);
  }, [article.tags, tags]);
  
  return (
    <button
      onClick={onClick}
      className="bg-surface border border-border-default text-left w-full transition-all transform hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex flex-col h-full group"
    >
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        <img 
            src={article.image_path} 
            alt={article.title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            loading="lazy"
        />
      </div>
      <div className="p-6 flex-grow flex flex-col">
          <div className="flex-grow">
            <div className="flex flex-wrap gap-2 mb-2">
                {articleTags.map(tagName => (
                    <span key={tagName} className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5">
                        {tagName}
                    </span>
                ))}
            </div>
            <h3 className="font-bold text-lg text-text-heading leading-tight">{article.title}</h3>
            <p className="text-sm text-text-secondary mt-2 line-clamp-3">{article.excerpt}</p>
          </div>
          <p className="text-xs text-text-secondary mt-4 pt-4 border-t border-border-default">{new Date(article.published_date).toLocaleDateString()}</p>
      </div>
    </button>
  );
};


export const ArticleListPage: React.FC<ArticleListPageProps> = ({ appData, onNavigateToDetail }) => {
  const { articles, articleTags, uiText } = appData;
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  
  const tags = useMemo(() => {
    return [...articleTags].sort((a, b) => a.tagName.localeCompare(b.tagName));
  }, [articleTags]);
  
  const displayedArticles = useMemo(() => {
    const sorted = [...articles]
      .filter(a => a.is_published)
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
    if (!activeTagId) {
      return sorted;
    }
    return sorted.filter(p => p.tags.includes(activeTagId));
  }, [articles, activeTagId]);

  return (
    <>
      <main className="flex-grow w-full max-w-screen-xl mx-auto px-4 pt-16 pb-8">
        <div className="border-b border-border-default pb-4 mb-8">
            <h1 className="text-3xl font-bold text-text-heading">
                お役立ちコンテンツ
            </h1>
            <p className="text-lg text-text-secondary mt-1">オリジナルTシャツ作成のヒントやデザイン事例をご紹介</p>
        </div>

        <div className="mb-8 p-4 bg-surface border border-border-default">
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-text-secondary mr-2">絞り込み:</span>
                <button
                    onClick={() => setActiveTagId(null)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${!activeTagId ? 'bg-primary text-white shadow' : 'bg-background-subtle border border-border-default text-text-primary hover:bg-gray-200'}`}
                >
                    すべて
                </button>
                {tags.map(tag => (
                    <button
                        key={tag.tagId}
                        onClick={() => setActiveTagId(tag.tagId)}
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTagId === tag.tagId ? 'bg-primary text-white shadow' : 'bg-background-subtle border border-border-default text-text-primary hover:bg-gray-200'}`}
                    >
                        {tag.tagName}
                    </button>
                ))}
            </div>
        </div>
        
        {displayedArticles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedArticles.map(article => (
              <ArticleCard 
                key={article.id}
                article={article}
                tags={articleTags}
                onClick={() => onNavigateToDetail(article.slug)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <i className="fas fa-file-alt text-5xl text-gray-400 mb-4"></i>
            <h3 className="text-xl font-semibold text-text-primary">記事が見つかりませんでした</h3>
            <p className="text-text-secondary mt-2">別の条件でお試しください。</p>
          </div>
        )}
      </main>
      <ScrollToTopButton uiText={uiText} />
    </>
  );
};