import React, { useMemo } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import { AppData, BreadcrumbItem, Product } from '../types';
import { StructuredData } from './StructuredData';

const getFullProductName = (p: Product | undefined): string => {
  if (!p) return '';
  const nameParts = [p.name, p.variantName].filter(Boolean);
  return nameParts.join(' ');
};


export const Breadcrumbs: React.FC<{ appData: AppData }> = ({ appData }) => {
    const location = useLocation();
    const params = useParams();
    const { categories, products: productsByBrand, galleryImages } = appData;

    const allProducts = useMemo(() => Object.values(productsByBrand).flat(), [productsByBrand]);

    const breadcrumbs = useMemo(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const crumbs: BreadcrumbItem[] = [{ name: 'ホーム', path: '/' }];

        let currentPath = '';
        pathParts.forEach((part, index) => {
            currentPath += `/${part}`;
            
            if (part === 'search' && pathParts[index + 1]) {
                const query = decodeURIComponent(pathParts[index + 1]);
                crumbs.push({ name: `${query} の検索結果`, path: currentPath });
            } else if (part === 'product' && params.productId) {
                 const product = allProducts.find(p => p.id === params.productId);
                 if (product) {
                    const category = categories.find(c => c.categoryId === product.categoryId);
                    if (category) {
                         crumbs.push({ name: category.categoryName, path: `/search/${encodeURIComponent(category.categoryName)}` });
                    }
                    crumbs.push({ name: getFullProductName(product), path: currentPath });
                 }
            } else if (part === 'gallery') {
                 crumbs.push({ name: 'ギャラリー', path: '/gallery' });
                 if (params.galleryImageId) {
                    const galleryItem = galleryImages.find(g => g.id === params.galleryImageId);
                    if (galleryItem) {
                        crumbs.push({ name: galleryItem.title, path: currentPath });
                    }
                 }
            } else if (part === 'my-page') {
                crumbs.push({ name: 'マイページ', path: '/my-page' });
            } else {
                const menu = appData.menus.find(m => m.path === currentPath);
                if (menu && menu.parent_id !== null) { // Don't add top-level items again
                    crumbs.push({ name: menu.name, path: currentPath });
                }
            }
        });

        // Remove duplicates that might occur with complex routing
        return crumbs.filter((crumb, index, self) =>
            index === self.findIndex((c) => (
                c.path === crumb.path
            ))
        );

    }, [location.pathname, params, categories, allProducts, galleryImages, appData.menus]);

    if (breadcrumbs.length <= 1) {
        return null; // Don't show breadcrumbs on the home page
    }
    
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': crumb.name,
            'item': `${appData.theme.site_base_url}${crumb.path}`
        }))
    };

    return (
        <div className="bg-background-subtle border-b border-border-default">
            <StructuredData schema={breadcrumbSchema} />
            <nav aria-label="パンくずリスト" className="w-full max-w-screen-2xl mx-auto px-4">
                <ol className="flex items-center space-x-2 text-sm text-text-secondary py-2">
                    {breadcrumbs.map((crumb, index) => (
                        <li key={index} className="flex items-center">
                            {index < breadcrumbs.length - 1 ? (
                                <>
                                    <Link to={crumb.path} className="hover:underline hover:text-secondary transition-colors">
                                        {crumb.name}
                                    </Link>
                                    <i className="fas fa-chevron-right text-xs mx-2 text-gray-400"></i>
                                </>
                            ) : (
                                <span className="font-semibold text-text-primary" aria-current="page">
                                    {crumb.name}
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </div>
    );
};
