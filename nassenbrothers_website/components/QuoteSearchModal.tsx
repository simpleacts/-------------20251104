import React, { useState, useEffect } from 'react';
import { PrintLocation, EstimatorState, PrintSize, PlateType, HomePageProps } from '../types';

interface QuoteSearchModalProps {
  uiText: Record<string, string>;
  onClose: () => void;
  // FIX: Update prop type to match what HomePage provides, resolving the type error.
  onNavigateToEstimator: HomePageProps['onNavigateToEstimator'];
  onNavigateToPrivacyPolicy: () => void;
}

const generateEstimateId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `E${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const LoadingSpinner: React.FC<{ uiText: Record<string, string> }> = ({ uiText }) => (
    <div className="flex items-center justify-center h-24">
        <div className="w-8 h-8 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
        <span className="ml-4 text-gray-600">{uiText['quoteSearch.loading']}</span>
    </div>
);

const mockQuoteData = {
  isTest: {
    estimateId: 'E20240728-103000123',
    customerInfo: { companyName: 'テスト株式会社', nameKanji: '山田 太郎', nameKana: 'やまだ たろう', email: 'test@example.com', phone: '090-1234-5678', zipCode: '1000001', address1: '東京都千代田区', address2: 'テストビル101', notes: 'テスト用の備考です', hasSeparateShippingAddress: false, shippingName: '', shippingPhone: '', shippingZipCode: '', shippingAddress1: '', shippingAddress2: '' },
    orderDetails: [
      { productId: 'united-athle-500101', productName: '500101 - 5.6オンス ハイクオリティーTシャツ アダルト', color: 'ホワイト', size: 'M', quantity: 30, unitPrice: 500 },
      { productId: 'united-athle-500101', productName: '500101 - 5.6オンス ハイクオリティーTシャツ アダルト', color: 'ブラック', size: 'L', quantity: 20, unitPrice: 540 }
    ],
    printDesigns: [
      { id: 'd1', location: 'frontCenter' as PrintLocation, size: '30x40' as PrintSize, colors: 2, plateType: 'normal' as PlateType, specialInks: [] }
    ],
    isDataConfirmed: true, isOrderPlaced: false, orderDate: null, isAdminMode: false,
  } as EstimatorState,
  isAdmin: {
    estimateId: 'ADMIN-QUOTE-001',
    customerInfo: { companyName: '捺染兄弟', nameKanji: '管理 太郎', nameKana: 'カンリ タロウ', email: 'admin@nassenbrothers.com', phone: '0533-00-0000', zipCode: '4411211', address1: '愛知県豊川市', address2: '江島町稲場22-2', notes: '', hasSeparateShippingAddress: false, shippingName: '', shippingPhone: '', shippingZipCode: '', shippingAddress1: '', shippingAddress2: '' },
    orderDetails: [], printDesigns: [], isDataConfirmed: false, isOrderPlaced: false, orderDate: null, isAdminMode: true,
  } as EstimatorState
};


export const QuoteSearchModal: React.FC<QuoteSearchModalProps> = ({ uiText, onClose, onNavigateToEstimator, onNavigateToPrivacyPolicy }) => {
  const [estimateId, setEstimateId] = useState('');
  const [email, setEmail] = useState('');
  
  const [searchStep, setSearchStep] = useState<'form' | 'loading' | 'result' | 'error'>('form');
  const [foundQuote, setFoundQuote] = useState<EstimatorState | null>(null);
  const [errorMessage, setErrorMessage] = useState('');


  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchStep('loading');
    setErrorMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const trimmedId = estimateId.trim();
      const trimmedEmail = email.trim();
      
      const ADMIN_QUOTE_ID = 'ADMIN-QUOTE-001';
      const ADMIN_EMAIL = 'admin@nassenbrothers.com';
      const isTestUser = trimmedId === 'E20240728-103000123' && trimmedEmail === 'test@example.com';
      const isAdminUser = trimmedId === ADMIN_QUOTE_ID && trimmedEmail === ADMIN_EMAIL;

      if (isTestUser) {
        setFoundQuote(mockQuoteData.isTest);
        setSearchStep('result');
      } else if (isAdminUser) {
        setFoundQuote(mockQuoteData.isAdmin);
        setSearchStep('result');
      } else {
        setErrorMessage(uiText['quoteSearch.error.notFound']);
        setSearchStep('error');
      }
    } catch (err) {
      setErrorMessage(uiText['quoteSearch.error.generic']);
      setSearchStep('error');
    }
  };

  const handleRestore = () => {
    if (!foundQuote) return;
    localStorage.setItem('estimatorState', JSON.stringify(foundQuote));
    // FIX: Call with no arguments to match the new prop type
    onNavigateToEstimator();
  };

  const handleReorder = () => {
    if (!foundQuote) return;
    const reorderState: EstimatorState = {
      ...foundQuote,
      isReorder: true,
      originalEstimateId: foundQuote.estimateId,
      estimateId: generateEstimateId(),
    };
    localStorage.setItem('estimatorState', JSON.stringify(reorderState));
    // FIX: Call with no arguments to match the new prop type
    onNavigateToEstimator();
  };

  const handleCreateNew = () => {
    localStorage.removeItem('estimatorState');
    onNavigateToEstimator();
  };
  
  const renderForm = () => (
    <form onSubmit={handleSearch} className="space-y-4">
        <div>
            <label htmlFor="quote-id-search" className="block text-sm font-medium text-gray-700 mb-1">{uiText['quoteSearch.id.label']}</label>
            <input
              type="text"
              id="quote-id-search"
              value={estimateId}
              onChange={(e) => setEstimateId(e.target.value)}
              placeholder={uiText['quoteSearch.id.placeholder']}
              required
              className="w-full p-2 border border-gray-300 focus:ring-secondary focus:border-secondary"
            />
        </div>
        <div>
            <label htmlFor="email-search" className="block text-sm font-medium text-gray-700 mb-1">{uiText['quoteSearch.email.label']}</label>
            <input
              type="email"
              id="email-search"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={uiText['quoteSearch.email.placeholder']}
              required
              className="w-full p-2 border border-gray-300 focus:ring-secondary focus:border-secondary"
            />
        </div>
        <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-4 hover:bg-primary/90 transition-colors">
            {uiText['quoteSearch.searchButton']}
        </button>
        <div className="text-center">
            <button type="button" onClick={handleCreateNew} className="text-sm text-secondary hover:underline">
                {uiText['quoteSearch.newEstimateLink']}
            </button>
        </div>
        <p className="text-xs text-gray-500 text-center">
            {uiText['quoteSearch.privacy.prefix']}
            <button type="button" onClick={onNavigateToPrivacyPolicy} className="underline hover:text-secondary">
                {uiText['quoteSearch.privacy.link']}
            </button>
            {uiText['quoteSearch.privacy.suffix']}
        </p>
    </form>
  );

  const renderResult = () => (
    <div className="text-center space-y-4">
      <i className="fas fa-check-circle text-4xl text-green-500"></i>
      <h3 className="text-lg font-bold">{uiText['quoteSearch.result.title']}</h3>
      <div className="bg-gray-50 p-3 text-left text-sm border">
          <p><strong>{uiText['quoteSearch.id.label']}:</strong> {foundQuote?.estimateId}</p>
          <p><strong>{uiText['quoteSearch.customerName']}:</strong> {foundQuote?.customerInfo.nameKanji}</p>
          <p><strong>{uiText['quoteSearch.itemCount']}:</strong> {foundQuote?.orderDetails.reduce((sum, item) => sum + item.quantity, 0)}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={handleRestore} className="flex-1 bg-secondary text-white font-bold py-3 px-4 hover:bg-secondary/90">
            {uiText['quoteSearch.restoreButton']}
        </button>
        <button onClick={handleReorder} className="flex-1 bg-green-600 text-white font-bold py-3 px-4 hover:bg-green-700">
            {uiText['quoteSearch.reorderButton']}
        </button>
      </div>
       <button type="button" onClick={() => setSearchStep('form')} className="text-sm text-gray-500 hover:underline mt-4">
            {uiText['quoteSearch.backToSearch']}
       </button>
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-4">
       <i className="fas fa-exclamation-triangle text-4xl text-accent"></i>
       <h3 className="text-lg font-bold">{uiText['quoteSearch.error.title']}</h3>
       <p className="text-gray-600">{errorMessage}</p>
       <button onClick={() => setSearchStep('form')} className="w-full bg-primary text-white font-bold py-3 px-4 hover:bg-primary/90">
            {uiText['quoteSearch.backToSearch']}
       </button>
    </div>
  );
  
  const renderContent = () => {
      switch(searchStep) {
          case 'loading': return <LoadingSpinner uiText={uiText} />;
          case 'result': return renderResult();
          case 'error': return renderError();
          case 'form':
          default:
            return renderForm();
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4 animate-fade-in">
        <div 
            className="fixed inset-0" 
            onClick={onClose}
            aria-hidden="true"
        ></div>
        <div className="relative bg-surface shadow-2xl w-full max-w-md animate-fade-in-up">
            <header className="p-4 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-text-heading">{uiText['quoteSearch.title']}</h3>
                <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl">&times;</button>
            </header>
            <main className="p-6">
                {renderContent()}
            </main>
        </div>
    </div>
  );
};