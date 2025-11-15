import React, { useMemo } from 'react';
import { AppData, Article, ArticleTag } from '../types';
import { ScrollToTopButton } from './ScrollToTopButton';
import { MetaTags } from './MetaTags';

interface ArticleTagPageProps {
  appData: AppData;
  tagId: string;
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


export const ArticleTagPage: React.FC<ArticleTagPageProps> = ({ appData, tagId, onNavigateToDetail }) => {
  const { articles, articleTags, uiText, theme } = appData;
  
  const activeTag = useMemo(() => articleTags.find(t => t.tagId === tagId), [articleTags, tagId]);
  
  const displayedArticles = useMemo(() => {
    if (!activeTag) return [];
    return [...articles]
      .filter(a => a.is_published && a.tags.includes(tagId))
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  }, [articles, tagId, activeTag]);

  const pageTitle = activeTag ? `タグ: ${activeTag.tagName}` : 'タグの記事一覧';
  const pageDescription = activeTag ? `${activeTag.tagName}に関連するお役立ちコンテンツの一覧です。` : 'お役立ちコンテンツをタグで絞り込んでいます。';
  const canonicalUrl = `${theme.site_base_url}/articles/tags/${tagId}`;


  if (!activeTag) {
    return <div className="p-8 text-center">指定されたタグは存在しません。</div>
  }

  return (
    <>
      <MetaTags title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} />
      <main className="flex-grow w-full max-w-screen-xl mx-auto px-4 pt-16 pb-8">
        <div className="border-b border-border-default pb-4 mb-8">
            <h1 className="text-3xl font-bold text-text-heading">
                {pageTitle}
            </h1>
            <p className="text-lg text-text-secondary mt-1">{pageDescription}</p>
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
            <p className="text-text-secondary mt-2">このタグに関連する記事はまだありません。</p>
          </div>
        )}
      </main>
      <ScrollToTopButton uiText={uiText} />
    </>
  );
};
