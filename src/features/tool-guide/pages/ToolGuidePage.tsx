import React, { useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { PhotoIcon } from '@components/atoms';
import DataIOGuide from '../content/DataIOGuide';
import FileNameConverterGuide from '../content/FileNameConverterGuide';
import ImageBatchLinkerGuide from '../content/ImageBatchLinkerGuide';
import ToolDependencyManagerGuide from '../content/ToolDependencyManagerGuide';

const ToolGuide: React.FC = () => {
    const { t } = useTranslation('tool-guide');
    const [activeTool, setActiveTool] = useState('data-io');

    const tools = [
        { id: 'data-io', title: t('tool_guide.data_io', 'データ入出力'), icon: <i className="fa-solid fa-database w-5 text-center"></i>, content: <DataIOGuide /> },
        { id: 'filename-converter', title: t('tool_guide.filename_converter', 'ファイル名変換'), icon: <i className="fa-solid fa-text-width w-5 text-center"></i>, content: <FileNameConverterGuide /> },
        { id: 'image-linker', title: t('tool_guide.image_linker', '商品画像一括紐付け'), icon: <PhotoIcon className="w-5 h-5" />, content: <ImageBatchLinkerGuide /> },
        { id: 'tool-dependency-manager', title: t('tool_guide.tool_dependency_manager', 'ツール依存性管理'), icon: <i className="fa-solid fa-diagram-project w-5 text-center"></i>, content: <ToolDependencyManagerGuide /> }
    ];

    const activeToolContent = tools.find(tool => tool.id === activeTool)?.content;

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-bold">{t('tool_guide.title', '使い方ガイド')}</h1>
                <p className="text-muted dark:text-muted-dark mt-2">{t('tool_guide.description', '各種ツールの目的と操作手順を解説します。')}</p>
            </header>
            
            <div className="flex flex-col md:flex-row gap-8">
                <nav className="md:w-1/4 flex-shrink-0">
                    <ul className="space-y-2 sticky top-6">
                        {tools.map(tool => (
                            <li key={tool.id}>
                                <button
                                    onClick={() => setActiveTool(tool.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                        activeTool === tool.id
                                            ? 'bg-brand-secondary/20 text-brand-primary dark:text-brand-secondary font-semibold'
                                            : 'hover:bg-base-200 dark:hover:bg-base-dark-300'
                                    }`}
                                >
                                    <span className="text-brand-secondary">{tool.icon}</span>
                                    <span>{tool.title}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <main className="md:w-3/4 bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md min-h-[60vh]">
                    {activeToolContent}
                </main>
            </div>
        </div>
    );
};

export default ToolGuide;
