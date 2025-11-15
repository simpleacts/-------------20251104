import React, { useState, useEffect } from 'react';
import { AppData } from '../types';

export const ComingSoonPage: React.FC<{ appData: AppData }> = ({ appData }) => {
    const { theme, companyInfo } = appData;
    const [videoSrc, setVideoSrc] = useState<string | null>(null);

    useEffect(() => {
        // Fetch a random video from site assets, similar to the hero section
        fetch('/templates/site_assets.json')
            .then(res => res.json())
            .then(data => {
                if (data?.heroVideos?.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.heroVideos.length);
                    setVideoSrc(data.heroVideos[randomIndex]);
                }
            })
            .catch(console.error);
    }, []);

    return (
        <div className="relative h-screen flex flex-col items-center justify-center text-center text-white overflow-hidden">
            {videoSrc && (
                <video
                    key={videoSrc}
                    className="absolute top-1/2 left-1/2 w-auto h-auto min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2 z-0"
                    autoPlay
                    loop
                    muted
                    playsInline
                >
                    <source src={videoSrc} type="video/mp4" />
                </video>
            )}
            <div className="absolute inset-0 bg-black/60 z-10"></div>
            <main className="relative z-20 p-4 flex-grow flex flex-col items-center justify-center">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {theme.coming_soon_page_title || 'ただいま準備中です'}
                </h1>
                <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {theme.coming_soon_page_message || '新しいコンテンツを準備しております。公開まで今しばらくお待ちください。'}
                </p>
            </main>
             <footer className="relative z-20 w-full p-4 text-center text-sm text-gray-400">
                <p>&copy; {new Date().getFullYear()} {companyInfo.companyName}</p>
            </footer>
        </div>
    );
};