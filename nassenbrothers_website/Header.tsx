// FIX: Corrected React import syntax for hooks.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from '../types';

interface HeaderProps {
  menus: Menu[];
  isTransparent?: boolean;
  onNavigateHome: () => void;
  uiText: Record<string, string>;
  isLoggedIn: boolean;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ menus, isTransparent = false, onNavigateHome, uiText, isLoggedIn, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [isMyPageMenuOpen, setIsMyPageMenuOpen] = useState(false);
  const [isMobileProductMenuOpen, setIsMobileProductMenuOpen] = useState(false);
  const [isMobileMyPageMenuOpen, setIsMobileMyPageMenuOpen] = useState(false);
  
  const productMenuRef = useRef<HTMLDivElement>(null);
  const myPageMenuRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const { topLevelMenus, productMenus, myPageMenus, productMenuParent, myPageMenuParent } = useMemo(() => {
    const topLevel: Menu[] = [];
    const product: Menu[] = [];
    const myPage: Menu[] = [];

    const productParent = menus.find(m => m.path === '#');
    const myPageParent = menus.find(m => m.path === '/my-page');

    const productParentId = productParent ? productParent.id : null;
    const myPageParentId = myPageParent ? myPageParent.id : null;

    menus.forEach(menu => {
      if (menu.parent_id === null) {
        topLevel.push(menu);
      } else if (menu.parent_id === productParentId) {
        product.push(menu);
      } else if (menu.parent_id === myPageParentId) {
        myPage.push(menu);
      }
    });

    return { 
      topLevelMenus: topLevel.sort((a,b) => a.sort_order - b.sort_order), 
      productMenus: product.sort((a,b) => a.sort_order - b.sort_order),
      myPageMenus: myPage.sort((a,b) => a.sort_order - b.sort_order),
      productMenuParent: productParent,
      myPageMenuParent: myPageParent,
    };
  }, [menus]);

  const myPageMenusWithLogout = useMemo(() => {
    if (!isLoggedIn || !myPageMenuParent) return myPageMenus;
    const logoutItem: Menu = {
        id: 999,
        name: 'ログアウト',
        path: '#logout',
        parent_id: myPageMenuParent.id,
        sort_order: 999,
        icon: 'fa-sign-out-alt'
    };
    return [...myPageMenus, logoutItem];
  }, [myPageMenus, isLoggedIn, myPageMenuParent]);


  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);
  
  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    setIsProductMenuOpen(false);
    setIsMyPageMenuOpen(false);
    if (path === '#logout') {
        onLogout();
    } else if (path && path !== '#') {
      navigate(path);
    }
  }

  const handleHomeClick = () => {
    setIsMenuOpen(false);
    onNavigateHome();
  }

  const isProductPage = useMemo(() => {
    return productMenus.some(m => location.pathname === m.path);
  }, [productMenus, location.pathname]);

  const isMyPage = useMemo(() => {
    return location.pathname.startsWith('/my-page');
  }, [location.pathname]);

  const navLinkClasses = (path: string, isDropdown: boolean = false, isMyPageDropdown: boolean = false) => {
    let isActive = false;
    if (isDropdown) {
        isActive = isProductPage;
    } else if (isMyPageDropdown) {
        isActive = isMyPage;
    } else {
        isActive = location.pathname === path;
    }

    return `px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? (isTransparent ? 'bg-white/20 text-white' : 'bg-primary text-white')
        : (isTransparent ? 'text-white hover:bg-white/10' : 'text-text-secondary hover:bg-background-subtle')
    }`;
  }

  const mobileNavLinkClasses = (options: { isSubItem?: boolean, isDropdown?: boolean, isMyPageDropdown?: boolean, path: string } = { path: '' }) => {
    const { isSubItem = false, isDropdown = false, isMyPageDropdown = false, path } = options;
    let isActive = false;
    if (isDropdown) {
        isActive = isProductPage;
    } else if (isMyPageDropdown) {
        isActive = isMyPage;
    } else {
        isActive = location.pathname === path;
    }
    return `flex items-center w-full text-left px-4 py-3 text-base font-medium transition-colors ${isSubItem ? 'pl-12' : ''} ${
      isActive
        ? 'bg-background-subtle text-primary'
        : 'text-text-primary hover:bg-background-subtle'
    }`;
  }
  
  const navLinks = (
    <>
      {topLevelMenus.map(menu => {
        if (menu.id === productMenuParent?.id) {
          return (
            <div 
              key={menu.id}
              className="relative" 
              onMouseLeave={() => setIsProductMenuOpen(false)}
              ref={productMenuRef}
            >
              <button 
                onMouseEnter={() => setIsProductMenuOpen(true)}
                onClick={() => setIsProductMenuOpen(prev => !prev)}
                className={navLinkClasses(menu.path, true) + " flex items-center"}
                aria-haspopup="true"
                aria-expanded={isProductMenuOpen}
              >
                {menu.name}
                <i className={`fas fa-chevron-down text-xs ml-2 transition-transform transform ${isProductMenuOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {isProductMenuOpen && (
                <div className="absolute top-full left-0 w-48 bg-surface shadow-lg border border-border-default z-40 animate-fade-in-up">
                  {productMenus.map(submenu => (
                    <button
                      key={submenu.id}
                      onClick={() => handleNavigate(submenu.path)}
                      className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-background-subtle"
                    >
                      {submenu.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        if (isLoggedIn && menu.id === myPageMenuParent?.id) {
          return (
            <div 
              key={menu.id}
              className="relative" 
              onMouseLeave={() => setIsMyPageMenuOpen(false)}
              ref={myPageMenuRef}
            >
              <button 
                onMouseEnter={() => setIsMyPageMenuOpen(true)}
                onClick={() => setIsMyPageMenuOpen(prev => !prev)}
                className={navLinkClasses(menu.path, false, true) + " flex items-center"}
                aria-haspopup="true"
                aria-expanded={isMyPageMenuOpen}
              >
                {menu.name}
                <i className={`fas fa-chevron-down text-xs ml-2 transition-transform transform ${isMyPageMenuOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {isMyPageMenuOpen && (
                <div className="absolute top-full right-0 w-max bg-surface shadow-lg border border-border-default z-40 animate-fade-in-up">
                  {myPageMenusWithLogout.map(submenu => (
                    <button
                      key={submenu.id}
                      onClick={() => handleNavigate(submenu.path)}
                      className="w-full text-left px-4 py-2 text-sm flex items-center whitespace-nowrap transition-colors text-text-primary hover:bg-background-subtle"
                    >
                      <i className={`fas ${submenu.icon} w-6 mr-2 text-center text-text-secondary`}></i>
                      {submenu.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (menu.id === myPageMenuParent?.id) return null;

        return (
          <button key={menu.id} onClick={() => handleNavigate(menu.path)} className={navLinkClasses(menu.path)}>
            {menu.name}
          </button>
        );
      })}
       {!isLoggedIn && (
            <button onClick={() => navigate('/login')} className={navLinkClasses('/login')}>
                ログイン
            </button>
        )}
    </>
  );

  return (
    <>
      <header className={`transition-colors duration-300 ${isTransparent ? 'absolute top-0 left-0 right-0 z-30' : 'bg-surface/80 backdrop-blur-sm border-b border-border-default sticky top-0 z-30'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <button
                onClick={handleHomeClick}
                className="flex items-center transition-opacity hover:opacity-75 focus:outline-none"
                aria-label={uiText['header.home.ariaLabel']}
              >
                <h1 className={`text-2xl font-bold ${isTransparent ? 'text-white' : 'text-primary'}`}>捺染兄弟</h1>
              </button>
            </div>

            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks}
            </nav>

            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`inline-flex items-center justify-center p-2 ${isTransparent ? 'text-white hover:bg-white/20' : 'text-text-secondary hover:text-primary hover:bg-background-subtle'} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white`}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                <span className="sr-only">{uiText['header.mobileMenu.open.ariaLabel']}</span>
                {isMenuOpen ? (
                  <i className="fas fa-times h-6 w-6"></i>
                ) : (
                  <i className="fas fa-bars h-6 w-6"></i>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ease-in-out" 
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
        ></div>

        <div className={`fixed top-0 right-0 h-full w-64 bg-surface shadow-xl z-40 transition-transform transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} ease-in-out duration-300`}>
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="font-bold text-lg text-text-primary">{uiText['header.mobileMenu.title']}</h2>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-text-secondary hover:text-text-primary">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <nav className="flex flex-col py-2">
            <button onClick={handleHomeClick} className={mobileNavLinkClasses({ path: '/' })}>
              <i className={`fas fa-home w-6 text-center mr-3 text-text-secondary`}></i>ホーム
            </button>
            <hr className="my-2"/>
            
            {topLevelMenus.map((menu, index) => {
              const isProductDropdown = menu.id === productMenuParent?.id;
              const isMyPageDropdown = menu.id === myPageMenuParent?.id;
              
              if (isProductDropdown) {
                return (
                  <React.Fragment key={menu.id}>
                    <button onClick={() => setIsMobileProductMenuOpen(!isMobileProductMenuOpen)} className={mobileNavLinkClasses({ path: menu.path, isDropdown: true }) + ' justify-between'}>
                      <div className="flex items-center">
                        <i className={`fas ${menu.icon || 'fa-box-open'} w-6 text-center mr-3 text-text-secondary`}></i>{menu.name}
                      </div>
                      <i className={`fas fa-chevron-down text-sm text-gray-400 transition-transform transform ${isMobileProductMenuOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isMobileProductMenuOpen && (
                      <div className="flex flex-col animate-fade-in-up">
                        {productMenus.map(submenu => (
                          <button key={submenu.id} onClick={() => handleNavigate(submenu.path)} className={mobileNavLinkClasses({ path: submenu.path, isSubItem: true })}>
                            {submenu.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              if (isLoggedIn && isMyPageDropdown) {
                return (
                  <React.Fragment key={menu.id}>
                    <button onClick={() => setIsMobileMyPageMenuOpen(!isMobileMyPageMenuOpen)} className={mobileNavLinkClasses({ path: menu.path, isMyPageDropdown: true }) + ' justify-between'}>
                       <div className="flex items-center">
                        <i className={`fas ${menu.icon || 'fa-user'} w-6 text-center mr-3 text-text-secondary`}></i>{menu.name}
                      </div>
                      <i className={`fas fa-chevron-down text-sm text-gray-400 transition-transform transform ${isMobileMyPageMenuOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isMobileMyPageMenuOpen && (
                       <div className="flex flex-col animate-fade-in-up">
                        {myPageMenusWithLogout.map(submenu => (
                          <button key={submenu.id} onClick={() => handleNavigate(submenu.path)} className={mobileNavLinkClasses({ path: submenu.path, isSubItem: true })}>
                             <i className={`fas ${submenu.icon} w-6 text-center mr-3 text-text-secondary`}></i>
                            {submenu.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              if (isMyPageDropdown) return null;

              return (
                <React.Fragment key={menu.id}>
                  <button onClick={() => handleNavigate(menu.path)} className={mobileNavLinkClasses({ path: menu.path })}>
                    <i className={`fas ${menu.icon || 'fa-circle'} w-6 text-center mr-3 text-text-secondary`}></i>{menu.name}
                  </button>
                  {(index < topLevelMenus.length - 1 && menu.id !== productMenuParent?.id) && <hr className="my-2"/>}
                </React.Fragment>
              );
            })}

             {!isLoggedIn && (
              <>
                <hr className="my-2"/>
                <button onClick={() => handleNavigate('/login')} className={mobileNavLinkClasses({ path: '/login' })}>
                    <i className={`fas fa-sign-in-alt w-6 text-center mr-3 text-text-secondary`}></i>ログイン
                </button>
              </>
            )}

          </nav>
        </div>
      </div>
    </>
  );
};