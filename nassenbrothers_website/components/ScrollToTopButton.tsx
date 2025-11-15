import React, { useState, useEffect } from 'react';

interface ScrollToTopButtonProps {
    uiText: Record<string, string>;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ uiText }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const label = uiText['scrollToTop.ariaLabel'] || 'ページトップに戻る';

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 bg-black text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-opacity duration-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-label={label}
      title={label}
    >
      <i className="fas fa-arrow-up"></i>
    </button>
  );
};