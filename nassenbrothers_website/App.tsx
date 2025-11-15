// App.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Estimator } from './components/Estimator';
import { HowToUsePage } from './components/HowToUsePage';
import { PrintingInfoPage } from './components/PrintingInfoPage';
import { HomePage } from './HomePage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { SearchResultsPage } from './components/SearchResultsPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { GalleryPage } from './components/GalleryPage';
import { GalleryDetailPage } from './components/GalleryDetailPage';
// FIX: Corrected the import path for MyPage to use the root barrel file, resolving module loading error.
import MyPage from './MyPage';
import { ArticleListPage } from './components/ArticleListPage';
import { ArticleDetailPage } from './components/ArticleDetailPage';
import { AppData, Menu } from './types';
import { fetchData } from './services/apiService';
// FIX: Corrected import path for AdminApp component
import AdminApp from './AdminApp';
import { MetaTags } from './components/MetaTags';
import { StructuredData } from './components/StructuredData';
import { LoginPage } from './components/LoginPage';
import { LoginCallbackPage } from './components/LoginCallbackPage';
import { LoginErrorPage } from './components/LoginErrorPage';
import { ArticleTagPage } from './components/ArticleTagPage';
import { GalleryTagPage } from './components/GalleryTagPage';
import { trackPageView } from './services/userActivityService';
import { ComingSoonPage } from './components/ComingSoonPage';
// ADD: Import ErrorBoundary for global error handling
import { ErrorBoundary } from './components/ErrorBoundary';
// ADD: Import the new AIChatAssistant component
import { AIChatAssistant } from './components/AIChatAssistant';


const LoadingOverlay: React.FC = () => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <div className="w-12 h-12 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
  </div>
);

const LoadingErrorOverlay: React.FC<{ message: string, uiText?: Record<string, string> }> = ({ message, uiText }) => {
    const handleForceMockMode = () => {
        localStorage.setItem('devMode', 'mock');
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 p-8 text-center">
            <div className="w-16 h-16 text-accent mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-text-heading mb-2">{uiText?.['common.error.loadingFailed'] || 'データの読み込みに失敗しました'}</h2>
            <p className="text-text-secondary">{message}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button onClick={() => window.location.reload()} className="bg-primary text-white font-bold py-2 px-6 hover:bg-primary/90 transition">
                    {uiText?.['common.error.reload'] || '再読み込み'}
                </button>
                <button onClick={handleForceMockMode} className="bg-accent text-white font-bold py-2 px-6 hover:bg-accent/90 transition">
                    モックモードで再起動
                </button>
            </div>
        </div>
    );
};

type ActiveTab = 'dashboard' | 'customerInfo' | 'estimates' | 'history' | 'status' | 'invoices' | 'shipping' | 'addressBook';

const App: React.FC = () => {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('authToken'));

  const isFullPageLayout = location.pathname.startsWith('/admin');

  useEffect(() => {
    window.scrollTo(0, 0);
    // ページ遷移ごとに認証トークンの有無を確認し、ログイン状態を更新する
    const token = localStorage.getItem('authToken');
    const currentLoginStatus = !!token;
    if (isLoggedIn !== currentLoginStatus) {
        setIsLoggedIn(currentLoginStatus);
    }
  }, [location.pathname, isLoggedIn]);
  
  // Track page views for analytics
  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);
  }, [location]);


  useEffect(() => {
    fetchData()
      .then(data => setAppData(data))
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (appData?.theme) {
        const root = document.documentElement;
        const theme = appData.theme;
        Object.entries(theme).forEach(([key, value]) => {
            if (key.startsWith("A.") || key.startsWith("B.") || key.startsWith("C.") || key.startsWith("D.") || key.startsWith("E.") || key.startsWith("F.") || key.startsWith("G.") || key.startsWith("H.")) return;
            
            if (key.startsWith('font_family')) {
                 // Font families are applied via tailwind.config now
            } else {
                const kebabKey = key.replace(/([a-z09]|(?=[A-Z]))([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
                if (String(value).includes('var(--')) {
                  root.style.setProperty(`--${kebabKey}`, String(value));
                } else {
                  root.style.setProperty(`--${kebabKey}`, String(value));
                }
            }
        });
        
        if (theme.font_family_base) {
            root.style.setProperty('--font-family-base', theme.font_family_base);
        }
        if (theme.font_family_heading) {
            root.style.setProperty('--font-family-heading', theme.font_family_heading);
        }
    }
  }, [appData?.theme]);

  // Real-time theme editor listener
  useEffect(() => {
      if (window.self === window.top) return;

      const HIGHLIGHT_STYLE_ID = 'theme-editor-highlight';
      const INSPECTOR_OVERLAY_ID = 'theme-editor-inspector-overlay';
      let highlightedElements: Element[] = [];
      let inspectorMode = false;

      const variableToClassesMap: Record<string, string[]> = {
          '--primary-color': ['.bg-primary', '.text-primary', '.border-primary'],
          '--secondary-color': ['.bg-secondary', '.text-secondary', '.border-secondary', 'a'],
          '--accent-color': ['.bg-accent', '.text-accent', '.border-accent'],
          '--background-color-base': ['.bg-background'],
          '--background-color-subtle': ['.bg-background-subtle'],
          '--surface-color': ['.bg-surface'],
          '--text-color-base': ['.text-text-primary'],
          '--text-color-secondary': ['.text-text-secondary'],
          '--text-color-heading': ['.text-text-heading'],
          '--border-color-base': ['.border', '.border-border-default'],
      };
      
      const classToVariableMap: Record<string, string> = Object.entries(variableToClassesMap)
          .reduce((acc, [variable, classes]) => {
              classes.forEach(cls => {
                  const className = cls.startsWith('.') ? cls.substring(1) : cls;
                  acc[className] = variable;
              });
              return acc;
          }, {} as Record<string, string>);

      const applyHighlight = (key: string) => {
          clearHighlight();
          const style = document.createElement('style');
          style.id = HIGHLIGHT_STYLE_ID;
          style.innerHTML = `.theme-editor-highlight { outline: 2px dashed #f43f5e !important; outline-offset: 2px; }`;
          document.head.appendChild(style);

          const classes = variableToClassesMap[key];
          if (classes) {
              document.querySelectorAll(classes.join(', ')).forEach(el => {
                  el.classList.add('theme-editor-highlight');
                  highlightedElements.push(el);
              });
          }
      };
      
      const clearHighlight = () => {
          highlightedElements.forEach(el => el.classList.remove('theme-editor-highlight'));
          highlightedElements = [];
          document.getElementById(HIGHLIGHT_STYLE_ID)?.remove();
      };
      
      const createInspectorOverlay = () => {
          let overlay = document.getElementById(INSPECTOR_OVERLAY_ID);
          if (!overlay) {
              overlay = document.createElement('div');
              overlay.id = INSPECTOR_OVERLAY_ID;
              Object.assign(overlay.style, {
                  position: 'absolute', backgroundColor: 'rgba(79, 70, 229, 0.3)',
                  border: '2px dashed #4f46e5', zIndex: '9999',
                  pointerEvents: 'none', transition: 'all 100ms ease',
              });
              document.body.appendChild(overlay);
          }
          return overlay;
      };

      const handleInspectorMouseOver = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.id === INSPECTOR_OVERLAY_ID) return;
          const overlay = createInspectorOverlay();
          const rect = target.getBoundingClientRect();
          overlay.style.top = `${window.scrollY + rect.top}px`;
          overlay.style.left = `${window.scrollX + rect.left}px`;
          overlay.style.width = `${rect.width}px`;
          overlay.style.height = `${rect.height}px`;
      };

      const handleInspectorMouseOut = () => {
          const overlay = document.getElementById(INSPECTOR_OVERLAY_ID);
          if (overlay) Object.assign(overlay.style, { width: '0px', height: '0px' });
      };

      const handleInspectorClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          let element = e.target as HTMLElement;
          let foundVariable: string | null = null;
          
          while(element && element !== document.body) {
              for (const className of Array.from(element.classList)) {
                  if (classToVariableMap[className]) {
                      foundVariable = classToVariableMap[className];
                      break;
                  }
              }
              if (foundVariable) break;
              element = element.parentElement as HTMLElement;
          }

          if (foundVariable) {
              window.parent.postMessage({ type: 'ELEMENT_CLICKED', payload: { variable: foundVariable } }, '*');
          }
      };
      
      const toggleInspectorListeners = (active: boolean) => {
          if (active) {
              document.body.addEventListener('mouseover', handleInspectorMouseOver);
              document.body.addEventListener('mouseout', handleInspectorMouseOut);
              document.body.addEventListener('click', handleInspectorClick, true);
              document.body.style.cursor = 'crosshair';
          } else {
              document.body.removeEventListener('mouseover', handleInspectorMouseOver);
              document.body.removeEventListener('mouseout', handleInspectorMouseOut);
              document.body.removeEventListener('click', handleInspectorClick, true);
              document.getElementById(INSPECTOR_OVERLAY_ID)?.remove();
              document.body.style.cursor = 'default';
          }
      };

      const preventNav = (e: MouseEvent) => {
          if (inspectorMode && (e.target as HTMLElement).closest('a')) {
              e.preventDefault();
          }
      };

      const handleMessage = (event: MessageEvent) => {
          const { type, payload } = event.data;
          switch (type) {
              case 'THEME_UPDATE':
                  document.documentElement.style.setProperty(payload.key, payload.value);
                  break;
              case 'HIGHLIGHT_ELEMENT':
                  applyHighlight(payload.key);
                  break;
              case 'CLEAR_HIGHLIGHT':
                  clearHighlight();
                  break;
              case 'INSPECTOR_MODE_TOGGLE':
                  inspectorMode = payload.active;
                  toggleInspectorListeners(inspectorMode);
                  break;
          }
      };

      window.addEventListener('message', handleMessage);
      document.addEventListener('click', preventNav, true);

      return () => {
          window.removeEventListener('message', handleMessage);
          document.removeEventListener('click', preventNav, true);
          toggleInspectorListeners(false);
          clearHighlight();
      };
  }, []);


  const handleLogout = useCallback(() => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    navigate('/');
  }, [navigate]);

  const visibleMenus = useMemo(() => {
    if (!appData?.menus || !appData?.theme) return [];
    let filteredMenus = appData.menus;
    const settings = appData.theme;

    if (settings.enable_gallery_page === 'FALSE') {
      filteredMenus = filteredMenus.filter(m => m.path !== '/gallery');
    }
    if (settings.enable_partner_login === 'FALSE') {}
    
    return filteredMenus;
  }, [appData]);

  const handleNavigateToEstimator = useCallback((searchQuery: string = '') => {
    const params = new URLSearchParams();
    if (searchQuery) {
        params.set('q', searchQuery);
    }
    navigate(`/estimator?${params.toString()}`);
  }, [navigate]);
  
  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  const isComingSoonMode = appData?.theme?.enable_coming_soon_page === 'TRUE';
  
  if (error) {
      return <LoadingErrorOverlay message={error} uiText={appData?.uiText} />;
  }
  if (!appData) {
      return <LoadingOverlay />;
  }

  if (isComingSoonMode && !isFullPageLayout) {
      return <ComingSoonPage appData={appData} />;
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': appData.companyInfo.companyName,
    'url': appData.theme.site_base_url,
    'logo': `${appData.theme.site_base_url}/logo.png`,
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': appData.companyInfo.tel,
      'contactType': 'Customer Service',
    },
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'url': appData.theme.site_base_url,
    'name': appData.uiText['metadata.name'] || '捺染兄弟',
    'potentialAction': {
        '@type': 'SearchAction',
        'target': `${appData.theme.site_base_url}/search/{search_term_string}`,
        'query-input': 'required name=search_term_string',
    },
  };
  
  const ProductDetailWrapper = () => {
    const { productId } = useParams();
    return <ProductDetailPage appData={appData} productId={productId!} onNavigateToEstimator={handleNavigateToEstimator} onNavigateToSearchResults={(q) => navigate(`/search/${q}`)} onNavigateHome={() => navigate('/')} onNavigateBack={() => navigate(-1)} />;
  };

  const SearchResultsWrapper = () => {
      const { query } = useParams();
      return <SearchResultsPage appData={appData} initialQuery={decodeURIComponent(query!)} onNavigateToProductDetail={(id) => navigate(`/product/${id}`)} onNavigateHome={() => navigate('/')} />;
  };
  
  const GalleryDetailWrapper = () => {
      const { galleryImageId } = useParams();
      return <GalleryDetailPage appData={appData} galleryImageId={galleryImageId!} onNavigateBack={() => navigate(-1)} />;
  };

  const ArticleDetailWrapper = () => {
      const { slug } = useParams();
      return <ArticleDetailPage appData={appData} slug={slug!} onNavigateToProductDetail={(id) => navigate(`/product/${id}`)} onNavigateToArticle={(s) => navigate(`/articles/${s}`)} />;
  };

  const ArticleTagPageWrapper = () => {
    const { tagId } = useParams();
    return <ArticleTagPage appData={appData} tagId={tagId!} onNavigateToDetail={(slug) => navigate(`/articles/${slug}`)} />;
  };

  const GalleryTagPageWrapper = () => {
    const { tagId } = useParams();
    return <GalleryTagPage appData={appData} tagId={tagId!} onNavigateToDetail={(id) => navigate(`/gallery/${id}`)} />;
  };

  const EstimatorWrapper = () => {
      const searchParams = new URLSearchParams(location.search);
      const initialSearchQuery = searchParams.get('q') || '';
      const fromPage = searchParams.get('from');
      return <Estimator appData={appData} initialSearchQuery={initialSearchQuery} onNavigateHome={() => navigate('/')} onNavigateToPrivacyPolicy={() => navigate('/privacy-policy')} fromPage={fromPage} />;
  };
  
  const MyPageWrapper = () => {
    const { '*': activeTab = 'dashboard' } = useParams();
    return <MyPage appData={appData} activeTab={activeTab.split('/')[0] as ActiveTab} onNavigateToEstimator={(params) => {
      const searchParams = new URLSearchParams();
      if (params?.fromPage) searchParams.set('from', params.fromPage);
      if (params?.isReorder) searchParams.set('reorder', 'true');
      if (params?.estimateId) searchParams.set('id', params.estimateId);
      navigate(`/estimator?${searchParams.toString()}`);
    }} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-base line-base">
        {/* FIX: Wrap application routes in ErrorBoundary for global error handling */}
        <ErrorBoundary>
            <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="*" element={
                <>
                <MetaTags 
                    title={appData.uiText['metadata.name'] || '捺染兄弟'}
                    description={appData.uiText['metadata.description'] || ''}
                    canonicalUrl={appData.theme.site_base_url}
                />
                <StructuredData schema={organizationSchema} />
                <StructuredData schema={webSiteSchema} />

                <Header 
                    menus={visibleMenus}
                    isTransparent={isHomePage} 
                    onNavigateHome={() => navigate('/')}
                    uiText={appData.uiText}
                    isLoggedIn={isLoggedIn}
                    onLogout={handleLogout}
                />
                <div className="flex-grow">
                    <Routes>
                        <Route path="/" element={<HomePage appData={appData} onNavigateToEstimator={handleNavigateToEstimator} onNavigateToProductDetail={(id) => navigate(`/product/${id}`)} onNavigateToSearchResults={(q) => navigate(`/search/${q}`)} onNavigateToPrivacyPolicy={() => navigate('/privacy-policy')} onNavigateToArticle={(slug) => navigate(`/articles/${slug}`)} onNavigateToArticleList={() => navigate('/articles')} />} />
                        <Route path="/home" element={<HomePage appData={appData} onNavigateToEstimator={handleNavigateToEstimator} onNavigateToProductDetail={(id) => navigate(`/product/${id}`)} onNavigateToSearchResults={(q) => navigate(`/search/${q}`)} onNavigateToPrivacyPolicy={() => navigate('/privacy-policy')} onNavigateToArticle={(slug) => navigate(`/articles/${slug}`)} onNavigateToArticleList={() => navigate('/articles')} />} />
                        <Route path="/estimator" element={<EstimatorWrapper />} />
                        <Route path="/how-to-use" element={<HowToUsePage appData={appData} onNavigateToEstimator={() => navigate('/estimator')} />} />
                        <Route path="/printing-info" element={<PrintingInfoPage appData={appData} onNavigateToEstimator={() => navigate('/estimator')} />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicyPage appData={appData} onNavigateToEstimator={() => navigate('/estimator')} />} />
                        <Route path="/gallery" element={<GalleryPage appData={appData} onNavigateToGalleryDetail={(id) => navigate(`/gallery/${id}`)} />} />
                        <Route path="/gallery/tags/:tagId" element={<GalleryTagPageWrapper />} />
                        <Route path="/gallery/:galleryImageId" element={<GalleryDetailWrapper />} />
                        <Route path="/product/:productId" element={<ProductDetailWrapper />} />
                        <Route path="/search/:query" element={<SearchResultsWrapper />} />
                        <Route path="/articles" element={<ArticleListPage appData={appData} onNavigateToDetail={(slug) => navigate(`/articles/${slug}`)} />} />
                        <Route path="/articles/tags/:tagId" element={<ArticleTagPageWrapper />} />
                        <Route path="/articles/:slug" element={<ArticleDetailWrapper />} />
                        <Route path="/my-page/*" element={<MyPageWrapper />} />
                        <Route path="/login" element={<LoginPage appData={appData} />} />
                        <Route path="/login/callback" element={<LoginCallbackPage />} />
                        <Route path="/login/error" element={<LoginErrorPage />} />
                    </Routes>
                </div>
                <Footer appData={appData} />
                <AIChatAssistant appData={appData} />
                </>
            } />
            </Routes>
        </ErrorBoundary>
    </div>
  );
};

export default App;
