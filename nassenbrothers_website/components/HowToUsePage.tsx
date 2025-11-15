import React from 'react';
import { AppData, PageData } from '../types';
import { PageRenderer } from './ContentBlockRenderer';
import { MetaTags } from './MetaTags';

interface HowToUsePageProps {
  onNavigateToEstimator: () => void;
  appData: AppData;
}

export const HowToUsePage: React.FC<HowToUsePageProps> = ({ onNavigateToEstimator, appData }) => {
  const { uiText, pagesContent, theme } = appData;
  const pageData: PageData | undefined = pagesContent['how-to-use'];

  if (!pageData) {
    return <div>コンテンツの読み込みに失敗しました。</div>;
  }

  const { meta_title, meta_description } = pageData;
  const canonicalUrl = `${theme.site_base_url}/how-to-use`;

  return (
    <>
      <MetaTags 
        title={meta_title} 
        description={meta_description}
        canonicalUrl={canonicalUrl}
      />
      <main className="w-full max-w-screen-lg mx-auto px-4 pt-16 pb-12 bg-background">
        <div className="space-y-8 prose max-w-none">
          <PageRenderer pageData={pageData} appData={appData} />
        </div>

        <div className="text-center mt-16">
            <h2 className="text-2xl font-bold text-primary">{uiText['howToUse.start']}</h2>
            <button
                onClick={onNavigateToEstimator}
                className="mt-6 bg-primary text-white font-bold py-4 px-10 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-transform transform hover:scale-105 text-lg"
            >
                <i className="fas fa-calculator mr-3"></i>
                {uiText['howToUse.startButton']}
            </button>
        </div>
      </main>
    </>
  );
};
