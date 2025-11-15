import React from 'react';
import { AppData, PageData } from '../types';
import { PageRenderer } from './ContentBlockRenderer';
import { MetaTags } from './MetaTags';

interface PrivacyPolicyPageProps {
  onNavigateToEstimator: () => void;
  appData: AppData;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigateToEstimator, appData }) => {
  const { uiText, pagesContent, theme } = appData;
  const pageData: PageData | undefined = pagesContent['privacy-policy'];

  if (!pageData) {
    return <div>コンテンツの読み込みに失敗しました。</div>;
  }

  const { meta_title, meta_description } = pageData;
  const canonicalUrl = `${theme.site_base_url}/privacy-policy`;

  return (
    <>
       <MetaTags 
        title={meta_title}
        description={meta_description}
        canonicalUrl={canonicalUrl}
      />
      <main className="w-full max-w-screen-lg mx-auto px-4 pt-16 pb-12 bg-background">
        <div className="text-text-primary space-y-8 prose max-w-none">
          <PageRenderer pageData={pageData} appData={appData} />
        </div>
      </main>
    </>
  );
};
