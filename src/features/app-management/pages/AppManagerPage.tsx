

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Database, Row } from '@shared/types';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon, XMarkIcon, UploadIcon, ClipboardDocumentCheckIcon, CheckIcon } from '@components/atoms';

declare const JSZip: any;

interface AppManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const GeneratedChangesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    xmlContent: string;
}> = ({ isOpen, onClose, xmlContent }) => {
    const { t } = useTranslation('app-management');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(xmlContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{t('app_manager.changeset_title', 'AIアシスタント用 変更セット')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6 overflow-y-auto space-y-4">
                    <p className="text-sm">{t('app_manager.changeset_description', '以下のXMLをコピーして、AIアシスタントに送信してください。選択したファイルがシステムに反映されます。')}</p>
                    <textarea
                        readOnly
                        value={xmlContent}
                        className="w-full h-80 bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md p-2 text-xs font-mono"
                    />
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">{t('app_manager.close', '閉じる')}</button>
                    <button onClick={handleCopy} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800 flex items-center gap-2">
                         {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardDocumentCheckIcon className="w-5 h-5" />}
                         {copied ? t('app_manager.copied_exclamation', 'コピーしました！') : t('app_manager.copy_xml', 'XMLをコピー')}
                    </button>
                </footer>
            </div>
        </div>
    );
};


const AppImporter: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation('app-management');
    const [extractedFiles, setExtractedFiles] = useState<{ name: string; content: string }[]>([]);
    const [activeFileName, setActiveFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedFile, setCopiedFile] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [generatedXml, setGeneratedXml] = useState<string>('');
    const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);


    const resetState = () => {
        setExtractedFiles([]);
        setActiveFileName(null);
        setIsLoading(false);
        setError(null);
        setSelectedFiles(new Set());
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const processZipFile = async (file: File) => {
        if (!file || !file.type.includes('zip')) {
            setError(t('app_manager.upload_zip_error', 'ZIPファイルをアップロードしてください。'));
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);
            const filesData: { name: string; content: string }[] = [];
            
            const filePromises: Promise<void>[] = [];
            contents.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir) {
                    filePromises.push(
                        zipEntry.async('string').then(content => {
                            filesData.push({ name: relativePath, content });
                        })
                    );
                }
            });
            
            await Promise.all(filePromises);
            
            const sortedFiles = filesData.sort((a, b) => a.name.localeCompare(b.name));
            setExtractedFiles(sortedFiles);
            if (sortedFiles.length > 0) {
                setActiveFileName(sortedFiles[0].name);
                setSelectedFiles(new Set(sortedFiles.map(f => f.name))); // Initially select all
            }

        } catch (err) {
            setError(t('app_manager.parse_error', 'ZIPファイルの解析に失敗しました。ファイルが破損しているか、サポートされていない形式の可能性があります。'));
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processZipFile(e.dataTransfer.files[0]);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processZipFile(e.target.files[0]);
            e.target.value = '';
        }
    };

    const handleToggleSelection = (fileName: string) => {
        setSelectedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileName)) {
                newSet.delete(fileName);
            } else {
                newSet.add(fileName);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedFiles.size === extractedFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(extractedFiles.map(f => f.name)));
        }
    };
    
    const handleCopy = (content: string, filename: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedFile(filename);
            setTimeout(() => setCopiedFile(null), 2000);
        });
    };
    
    const handleCopyCombined = () => {
        const combinedContent = extractedFiles
            .filter(file => selectedFiles.has(file.name))
            .map(file => `--- START OF FILE ${file.name} ---\n${file.content}\n--- END OF FILE ${file.name} ---`)
            .join('\n\n');
        handleCopy(combinedContent, 'combined');
    };

    const handleGenerateForAI = () => {
        const changes = extractedFiles
            .filter(file => selectedFiles.has(file.name))
            .map(file => 
                `  <change>
    <file>${file.name}</file>
    <description>Imported file from template ZIP.</description>
    <content><![CDATA[${file.content}]]></content>
  </change>`
            )
            .join('\n');
        
        const xml = `<changes>\n${changes}\n</changes>`;
        setGeneratedXml(xml);
        setIsChangesModalOpen(true);
    };

    const activeFile = useMemo(() => extractedFiles.find(f => f.name === activeFileName), [extractedFiles, activeFileName]);

    if (!isOpen) return null;

    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={handleClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{t('app_manager.importer_title', 'ひな形インポーター')}</h2>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>

                <main className="flex-grow flex overflow-hidden">
                    {extractedFiles.length > 0 ? (
                        <>
                            <aside className="w-1/3 border-r border-base-300 dark:border-base-dark-300 flex flex-col">
                                <div className="p-3 border-b border-base-300 dark:border-base-dark-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold text-sm">{t('app_manager.file_list', 'ファイル一覧')} ({selectedFiles.size}/{extractedFiles.length})</h3>
                                        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={selectedFiles.size === extractedFiles.length} onChange={handleToggleSelectAll} /> {t('app_manager.all', 'すべて')}</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleCopyCombined} disabled={selectedFiles.size === 0} className="text-xs p-1.5 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50">{t('app_manager.combined_copy', '結合コピー')}</button>
                                        <button onClick={handleGenerateForAI} disabled={selectedFiles.size === 0} className="text-xs p-1.5 bg-blue-600 text-white rounded disabled:opacity-50">{t('app_manager.generate_changeset', 'AI用変更セット生成')}</button>
                                    </div>
                                </div>
                                <ul className="overflow-y-auto flex-grow">
                                    {extractedFiles.map(file => (
                                        <li key={file.name} onClick={() => setActiveFileName(file.name)} className={`flex items-center gap-2 px-3 py-2 text-xs font-mono cursor-pointer truncate ${activeFileName === file.name ? 'bg-brand-secondary/20 font-semibold' : 'hover:bg-base-200 dark:hover:bg-base-dark-300'}`}>
                                            <input type="checkbox" checked={selectedFiles.has(file.name)} onChange={() => handleToggleSelection(file.name)} onClick={e => e.stopPropagation()} />
                                            <span>{file.name}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="p-2 border-t border-base-300 dark:border-base-dark-300">
                                    <button onClick={resetState} className="w-full text-sm py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">{t('app_manager.load_another', '別のファイルを読み込む')}</button>
                                </div>
                            </aside>
                            <section className="w-2/3 flex flex-col">
                                {activeFile ? (
                                    <>
                                        <div className="flex-shrink-0 flex justify-between items-center p-3 border-b border-base-300 dark:border-base-dark-300 bg-base-200 dark:bg-base-dark-300/50">
                                            <p className="font-mono text-sm">{activeFile.name}</p>
                                            <button onClick={() => handleCopy(activeFile.content, activeFile.name)} className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
                                                {copiedFile === activeFile.name ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentCheckIcon className="w-4 h-4" />}
                                                {copiedFile === activeFile.name ? t('app_manager.copied', 'コピーしました') : t('app_manager.copy_code', 'コードをコピー')}
                                            </button>
                                        </div>
                                        <div className="flex-grow overflow-auto">
                                            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all"><code>{activeFile.content}</code></pre>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">{t('app_manager.select_file', 'ファイルを選択してください')}</div>
                                )}
                            </section>
                        </>
                    ) : (
                        <div className="w-full p-6 flex flex-col items-center justify-center">
                            {isLoading ? (
                                <>
                                    <SpinnerIcon className="w-10 h-10 text-brand-primary" />
                                    <p className="mt-4">{t('app_manager.extracting', 'ZIPファイルを展開中...')}</p>
                                </>
                            ) : (
                                <>
                                    <div onDrop={handleFileDrop} onDragOver={e => e.preventDefault()} className="w-full">
                                        <label htmlFor="zip-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-base-200 dark:hover:bg-base-dark-300/50 transition-colors">
                                            <UploadIcon className="w-12 h-12 mb-3 text-gray-400"/>
                                            <p className="font-semibold">{t('app_manager.drag_drop', 'アプリケーションの雛形ZIPファイルをここにドラッグ＆ドロップ')}</p>
                                            <p className="text-sm text-gray-500">{t('app_manager.click_select', 'またはクリックしてファイルを選択')}</p>
                                        </label>
                                        <input id="zip-upload" type="file" accept=".zip,application/zip" className="hidden" onChange={handleFileChange} />
                                    </div>
                                    {error && <p className="mt-4 text-sm text-red-500 bg-red-100 p-2 rounded">{error}</p>}
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
        <GeneratedChangesModal 
            isOpen={isChangesModalOpen}
            onClose={() => setIsChangesModalOpen(false)}
            xmlContent={generatedXml}
        />
      </>
    );
};

const AppManager: React.FC<AppManagerProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('app-management');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isImporterOpen, setIsImporterOpen] = useState(false);
    
    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('app_manager.title', 'アプリケーション管理')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('app_manager.description', '新しいウェブアプリの雛形を作成したり、既存のアプリを管理します。')}</p>
            </header>
            
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">{t('app_manager.managed_apps', '管理下のアプリケーション')}</h2>
                <div className="space-y-4">
                    <div className="p-4 border border-base-300 dark:border-base-dark-300 rounded-lg flex items-center justify-between">
                        <div>
                            <h3 className="font-bold">{t('app_manager.current_app_name', 'プリント屋バックオフィス (現在のアプリ)')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('app_manager.current_app_description', 'すべてのツールとデータ管理機能を含む、開発の司令塔です。')}</p>
                        </div>
                        <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">CORE</span>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-base-300 dark:border-base-dark-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                        onClick={() => setIsWizardOpen(true)}
                        className="text-center p-6 border-2 border-dashed border-base-300 dark:border-base-dark-300 rounded-lg hover:bg-base-200 dark:hover:bg-base-dark-300/50 transition-colors"
                    >
                        <i className="fa-solid fa-plus text-3xl text-brand-secondary"></i>
                        <h3 className="mt-2 text-lg font-bold">{t('app_manager.create_new', '新規アプリケーションを作成')}</h3>
                        <p className="text-sm text-gray-500">{t('app_manager.create_new_description', 'ウィザードを開始して、新しいウェブサイトやツールの雛形を生成します。')}</p>
                    </button>
                    <button 
                        onClick={() => setIsImporterOpen(true)}
                        className="text-center p-6 border-2 border-dashed border-base-300 dark:border-base-dark-300 rounded-lg hover:bg-base-200 dark:hover:bg-base-dark-300/50 transition-colors"
                    >
                        <i className="fa-solid fa-file-zipper text-3xl text-green-600"></i>
                        <h3 className="mt-2 text-lg font-bold">{t('app_manager.import_template', 'ひな形ZIPをインポート')}</h3>
                        <p className="text-sm text-gray-500">{t('app_manager.import_template_description', 'ZIPファイルをアップロードして、ファイル構成と内容を確認・コピーします。')}</p>
                    </button>
                </div>
            </div>

            {isWizardOpen && <AppCreationWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />}
            {isImporterOpen && <AppImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} />}
        </div>
    );
};


const AppCreationWizard: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation('app-management');
    const [step, setStep] = useState(1);
    const [appInfo, setAppInfo] = useState({ name: '', id: '' });
    const [template, setTemplate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAppNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setAppInfo({ name, id });
    };

    const handleGenerateZip = useCallback(async () => {
        setIsGenerating(true);
        try {
            const zip = new JSZip();

            const packageJsonContent = `{
  "name": "${appInfo.id}",
  "version": "1.0.0",
  "private": true,
  "description": "${appInfo.name}",
  "scripts": {
    "build": "esbuild index.tsx --bundle --outfile=dist/bundle.js --jsx=automatic --format=esm --loader:.tsx=tsx"
  },
  "devDependencies": { "esbuild": "^0.21.4" }
}`;
            zip.file('package.json', packageJsonContent);

            const metadataJsonContent = `{
  "name": "${appInfo.name}",
  "description": "${appInfo.name}",
  "requestFramePermissions": []
}`;
            zip.file('metadata.json', metadataJsonContent);

            // Fetching a base index.html and index.tsx from the current app
            const baseHtmlResponse = await fetch('/index.html');
            let baseHtml = await baseHtmlResponse.text();
            baseHtml = baseHtml.replace(/<title>.*<\/title>/, `<title>${appInfo.name}</title>`);
            zip.file('index.html', baseHtml);

            const indexTsxResponse = await fetch('/index.tsx');
            zip.file('index.tsx', await indexTsxResponse.text());

            let appTsxContent = `import React from 'react';

const App: React.FC = () => {
    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>Hello from ${appInfo.name}!</h1>
            <p>Edit App.tsx to start building your application.</p>
        </div>
    );
};

export default App;`;
            
            // If estimator template, fetch and include more files
            if (template === 'estimator') {
                 appTsxContent = `import React from 'react';
// Note: You need to provide the 'database' prop from your own data source.
// This is a placeholder for a self-contained component.
// import EstimatorPage from './components/EstimatorPage';

const App: React.FC = () => {
    return (
        <div>
            <h1>Estimator App</h1>
            <p>Integrate the EstimatorPage component here.</p>
            {/* <EstimatorPage database={yourDatabaseObject} ... /> */}
        </div>
    );
};
export default App;`;
                // In a real scenario, you'd fetch all related components.
                // For this example, we keep it simple.
            }
            
            zip.file('App.tsx', appTsxContent);


            const blob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${appInfo.id}_app_template.zip`;
            link.click();
            URL.revokeObjectURL(link.href);

            onClose();

        } catch (error) {
            console.error("Failed to generate ZIP", error);
            alert(t('app_manager.generate_failed', 'ファイルの生成に失敗しました。コンソールを確認してください。'));
        } finally {
            setIsGenerating(false);
        }
    }, [appInfo, template, onClose]);

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="app-name" className="block text-sm font-medium mb-1">{t('app_manager.app_name_label', 'アプリケーション名')}</label>
                            <input type="text" id="app-name" value={appInfo.name} onChange={handleAppNameChange} className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded" placeholder={t('app_manager.app_name_placeholder', '例: お客様向けホームページ')}/>
                            <p className="text-xs text-gray-500 mt-1">{t('app_manager.folder_name', 'フォルダ名:')} {appInfo.id}</p>
                        </div>
                        <button onClick={() => setStep(2)} disabled={!appInfo.id} className="w-full p-2 bg-brand-primary text-white rounded disabled:bg-gray-400">{t('app_manager.next', '次へ')}</button>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-3">
                        <h3 className="font-semibold">{t('app_manager.select_template', 'テンプレートを選択')}</h3>
                        <div onClick={() => setTemplate('minimal')} className={`p-4 border rounded cursor-pointer ${template === 'minimal' ? 'border-brand-primary ring-2 ring-brand-primary' : 'hover:border-gray-400'}`}>
                            <h4 className="font-bold">{t('app_manager.minimal_template', '最小構成テンプレート')}</h4>
                            <p className="text-xs">{t('app_manager.minimal_template_description', '基本的なファイル構造と設定のみを含む空のアプリケーション。')}</p>
                        </div>
                        <div onClick={() => setTemplate('estimator')} className={`p-4 border rounded cursor-pointer ${template === 'estimator' ? 'border-brand-primary ring-2 ring-brand-primary' : 'hover:border-gray-400'}`}>
                            <h4 className="font-bold">{t('app_manager.estimator_template', '見積機能付きテンプレート (近日公開)')}</h4>
                            <p className="text-xs text-gray-500">{t('app_manager.estimator_template_description', 'スタンドアロンで動作する見積作成機能を備えたアプリケーション。(現在は最小構成と同じ内容です)')}</p>
                        </div>
                         <div className="flex justify-between mt-4">
                            <button onClick={() => setStep(1)} className="p-2 bg-gray-300 rounded">{t('app_manager.back', '戻る')}</button>
                            <button onClick={() => setStep(3)} disabled={!template} className="p-2 bg-brand-primary text-white rounded disabled:bg-gray-400">{t('app_manager.next', '次へ')}</button>
                        </div>
                    </div>
                );
            case 3:
                 return (
                    <div>
                        <h3 className="font-semibold mb-3">{t('app_manager.final_confirmation', '最終確認')}</h3>
                        <div className="text-sm space-y-2 p-3 bg-base-200 dark:bg-base-dark-300 rounded">
                            <p><strong>{t('app_manager.app_name', 'アプリ名:')}</strong> {appInfo.name}</p>
                            <p><strong>{t('app_manager.folder_name_label', 'フォルダ名:')}</strong> {appInfo.id}</p>
                            <p><strong>{t('app_manager.template_label', 'テンプレート:')}</strong> {template === 'estimator' ? t('app_manager.estimator_template_name', '見積機能付き') : t('app_manager.minimal_template_name', '最小構成')}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('app_manager.generate_description', 'この内容でアプリケーションの雛形（ZIPファイル）を生成します。')}</p>
                        <div className="flex justify-between mt-4">
                            <button onClick={() => setStep(2)} className="p-2 bg-gray-300 rounded">{t('app_manager.back', '戻る')}</button>
                            <button onClick={handleGenerateZip} disabled={isGenerating} className="p-2 bg-green-600 text-white rounded disabled:bg-gray-400 flex items-center gap-2">
                                {isGenerating ? <SpinnerIcon /> : <i className="fa-solid fa-download"></i>}
                                {isGenerating ? t('app_manager.generating', '生成中...') : t('app_manager.generate_template', '雛形を生成')}
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{t('app_manager.wizard_title', '新規アプリケーション作成ウィザード (ステップ {step}/3)').replace('{step}', String(step))}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6">
                    {renderStep()}
                </main>
            </div>
        </div>
    );
};

export default AppManager;