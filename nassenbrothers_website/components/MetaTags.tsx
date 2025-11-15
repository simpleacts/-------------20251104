import React, { useEffect } from 'react';
import { MetaTagsProps } from '../types';

const updateMetaTag = (nameOrProperty: string, content: string) => {
    let element = document.querySelector(`meta[name="${nameOrProperty}"]`) || document.querySelector(`meta[property="${nameOrProperty}"]`);
    if (!element) {
        element = document.createElement('meta');
        if (nameOrProperty.startsWith('og:') || nameOrProperty.startsWith('twitter:')) {
            element.setAttribute('property', nameOrProperty);
        } else {
            element.setAttribute('name', nameOrProperty);
        }
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
};

const updateLinkTag = (rel: string, href: string) => {
    let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
    }
    element.setAttribute('href', href);
};

export const MetaTags: React.FC<MetaTagsProps> = ({ title, description, imageUrl, canonicalUrl, noIndex = false }) => {
    useEffect(() => {
        document.title = title;
        updateMetaTag('description', description);
        updateLinkTag('canonical', canonicalUrl);

        // Open Graph tags
        updateMetaTag('og:title', title);
        updateMetaTag('og:description', description);
        updateMetaTag('og:url', canonicalUrl);
        updateMetaTag('og:type', 'website');
        if (imageUrl) {
            updateMetaTag('og:image', imageUrl);
        }
        
        // Twitter Card tags
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', title);
        updateMetaTag('twitter:description', description);
        if (imageUrl) {
            updateMetaTag('twitter:image', imageUrl);
        }

        // Robots tag
        if (noIndex) {
            updateMetaTag('robots', 'noindex, nofollow');
        } else {
            // Ensure noindex tag is removed if it exists from a previous page
            const robotsTag = document.querySelector('meta[name="robots"]');
            if (robotsTag) {
                robotsTag.remove();
            }
        }

    }, [title, description, imageUrl, canonicalUrl, noIndex]);

    return null;
};