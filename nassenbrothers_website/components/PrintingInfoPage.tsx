import React from 'react';
import { AppData, PageData } from '../types';
import { PageRenderer } from './ContentBlockRenderer';
import { MetaTags } from './MetaTags';

interface PrintingInfoPageProps {
  appData: AppData;
  onNavigateToEstimator: () => void;
}

export const PrintingInfoPage: React.FC<PrintingInfoPageProps> = ({ appData, onNavigateToEstimator }) => {
  const { uiText, pagesContent, theme } = appData;
  const pageData: PageData | undefined = pagesContent['printing-info'];
  
  if (!pageData) {
    return <div>コンテンツの読み込みに失敗しました。</div>;
  }
  
  const { meta_title, meta_description } = pageData;
  const canonicalUrl = `${theme.site_base_url}/printing-info`;

  return (
    <>
      <MetaTags 
        title={meta_title}
        description={meta_description}
        canonicalUrl={canonicalUrl}
      />
      <main className="w-full max-w-screen-lg mx-auto px-4 pt-16 pb-12 bg-background">
        <div className="space-y-10 prose max-w-none">
          <PageRenderer pageData={pageData} appData={appData} />
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold text-primary">{uiText['printingInfo.start']}</h2>
          <p className="text-text-secondary mt-2 mb-6">
            選んだTシャツとデザインで、あなただけのオリジナルアイテムの価格を確認しましょう。
          </p>
          <button
            onClick={onNavigateToEstimator}
            className="bg-primary text-white font-bold py-4 px-10 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-transform transform hover:scale-105 text-lg"
          >
            <i className="fas fa-calculator mr-3"></i>
            {uiText['printingInfo.startButton']}
          </button>
        </div>
      </main>
    </>
  );
};
