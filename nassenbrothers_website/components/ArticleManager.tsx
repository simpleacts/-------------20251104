import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Article, ArticleTag } from '../types';
import { AIAssistant } from './AIAssistant';
import { SeoAssistantModal } from './SeoAssistantModal';
import { AIGalleryAssistant } from './AIGalleryAssistant';

interface ArticleManagerProps {
    isLocked: boolean;
}

// Helper functions
const parseCsv = <T extends object>(csvText: string): T[] => {
    if (!csvText) return [];
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        return headers.reduce((obj, header, index) => {
            let value = values[index] ? values[index].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            (obj as any)[header] = value;
            return obj;
        }, {} as T);
    });
};

const toCsv = (data: any[], headers: string[]): string => {
    const csvRows = [headers.join(',')];
    data.forEach(item => {
        const values = headers.map(header => {
            let value = Array.isArray(item[header]) ? item[header].join(',') : item[header] ?? '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    });
    return csvRows.join('\n');
};

const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const LockedOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
        <i className="fas fa-lock text-4xl text-gray-500 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-700">機能はロックされています</h3>
        <p className="text-gray-600">この機能の編集は現在ロックされています。</p>
        <p className="text-sm text-gray-500 mt-2">ロックを解除するには、開発ツールに移動してください。</p>
    </div>
);


const ArticleManager: React.FC<ArticleManagerProps> = ({ isLocked }) => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [tags, setTags] = useState<ArticleTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
    const location = useLocation();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [articlesRes, tagsRes] = await Promise.all([
                fetch('/templates/articles.csv?cachebust=' + new Date().getTime()),
                fetch('/templates/article_tags.csv?cachebust=' + new Date().getTime())
            ]);
            if (!articlesRes.ok || !tagsRes.ok) throw new Error('データ読み込みに失敗');
            
            const articlesCsv = await articlesRes.text();
            const tagsCsv = await tagsRes.text();

            const parsedArticles = parseCsv<Article>(articlesCsv).map(a => ({...a, tags: a.tags || []}));
            setArticles(parsedArticles);
            setTags(parseCsv<ArticleTag>(tagsCsv));

        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

     useEffect(() => {
        if (location.state?.newArticle) {
            handleCreateNew(location.state.newArticle);
        }
    }, [location.state]);


    const handleSave = async (updatedArticles: Article[], updatedTags: ArticleTag[]) => {
        try {
            const articleCsvHeaders = ['id', 'slug', 'title', 'excerpt', 'content', 'tags', 'published_date', 'image_path', 'is_published'];
            const tagCsvHeaders = ['tagId', 'tagName'];
            
            const articlesCsv = toCsv(updatedArticles, articleCsvHeaders);
            const tagsCsv = toCsv(updatedTags, tagCsvHeaders);

            const [articlesRes, tagsRes] = await Promise.all([
                fetch('/api/save_articles.php', { method: 'POST', body: articlesCsv }),
                fetch('/api/save_article_tags.php', { method: 'POST', body: tagsCsv })
            ]);

            if (!articlesRes.ok || !tagsRes.ok) throw new Error('保存に失敗しました。');
            
            setArticles(updatedArticles);
            setTags(updatedTags);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : '保存エラー');
            return false;
        }
    };
    
    const handleCreateNew = (initialData: Partial<Article> = {}) => {
        const newArticle: Article = {
            id: `a${Date.now()}`,
            slug: '',
            title: '',
            excerpt: '',
            content: '',
            tags: [],
            published_date: new Date().toISOString().split('T')[0],
            image_path: './images/placeholder.jpg',
            is_published: false,
            ...initialData
        };
        setCurrentArticle(newArticle);
        setIsEditorOpen(true);
    };

    const handleEdit = (article: Article) => {
        setCurrentArticle(article);
        setIsEditorOpen(true);
    };

    const handleDelete = async (articleId: string) => {
        if (window.confirm('この記事を削除しますか？')) {
            const newArticles = articles.filter(a => a.id !== articleId);
            await handleSave(newArticles, tags);
        }
    };

    const handleSaveArticle = async (articleToSave: Article, newTags: ArticleTag[]) => {
        const newArticles = [...articles];
        const index = newArticles.findIndex(a => a.id === articleToSave.id);
        if (index > -1) {
            newArticles[index] = articleToSave;
        } else {
            newArticles.unshift(articleToSave);
        }
        const success = await handleSave(newArticles, newTags);
        if(success) {
            setIsEditorOpen(false);
            setCurrentArticle(null);
        }
    };

    if (loading) return <div className="p-8"><i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...</div>;
    if (error) return <div className="p-8 text-red-600">エラー: {error}</div>;

    return (
        <div className="relative h-full">
            {isLocked && <LockedOverlay />}
            <div className="bg-white p-4 border-b sticky top-0 z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">記事管理</h2>
                    <p className="text-sm text-gray-500">お役立ちコンテンツを作成・編集します。</p>
                </div>
                <button onClick={() => handleCreateNew()} className="bg-primary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors hover:bg-primary/90">
                    <i className="fas fa-plus mr-2"></i>新規作成
                </button>
            </div>
            
            <div className="p-4">
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left">タイトル</th>
                                <th className="p-3 text-left">スラッグ</th>
                                <th className="p-3 text-left">公開日</th>
                                <th className="p-3 text-center">ステータス</th>
                                <th className="p-3 text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles.map(article => (
                                <tr key={article.id} className="border-b last:border-b-0">
                                    <td className="p-3 font-semibold">{article.title}</td>
                                    <td className="p-3 font-mono text-gray-500">/{article.slug}</td>
                                    <td className="p-3">{article.published_date}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${article.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {article.is_published ? '公開' : '下書き'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => handleEdit(article)} className="text-secondary hover:underline mr-4">編集</button>
                                        <button onClick={() => handleDelete(article.id)} className="text-accent hover:underline">削除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditorOpen && currentArticle && (
                <ArticleEditor
                    article={currentArticle}
                    allTags={tags}
                    onSave={handleSaveArticle}
                    onClose={() => setIsEditorOpen(false)}
                />
            )}
        </div>
    );
};

// ... Editor Component
const ArticleEditor: React.FC<{
    article: Article;
    allTags: ArticleTag[];
    onSave: (article: Article, newTags: ArticleTag[]) => Promise<void>;
    onClose: () => void;
}> = ({ article, allTags, onSave, onClose }) => {
    const [editedArticle, setEditedArticle] = useState<Article>(article);
    const [availableTags, setAvailableTags] = useState<ArticleTag[]>(allTags);
    const [saving, setSaving] = useState(false);
    const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);
    
    const handleFieldChange = (field: keyof Article, value: any) => {
        let newArticle = { ...editedArticle, [field]: value };
        if (field === 'title') {
            newArticle.slug = slugify(value);
        }
        setEditedArticle(newArticle);
    };

    const handleTagToggle = (tagId: string) => {
        const newTags = editedArticle.tags.includes(tagId)
            ? editedArticle.tags.filter(t => t !== tagId)
            : [...editedArticle.tags, tagId];
        handleFieldChange('tags', newTags);
    };

    const handleImageUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('imageFile', file);
        try {
            const res = await fetch('/api/upload_image.php', { method: 'POST', body: formData });
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.message);
            handleFieldChange('image_path', result.filePath);
        } catch (e) {
            alert('画像アップロード失敗: ' + (e as Error).message);
        }
    };
    
    const handleSubmit = async () => {
        setSaving(true);
        await onSave(editedArticle, availableTags);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[95vh] flex flex-col rounded-lg">
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">記事エディタ</h3>
                    <div>
                        <button onClick={() => setIsSeoModalOpen(true)} className="text-sm bg-purple-100 text-purple-700 font-semibold py-2 px-4 rounded-md hover:bg-purple-200 mr-4">
                            <i className="fas fa-rocket mr-2"></i>SEOアシスタント
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 mr-4">キャンセル</button>
                        <button onClick={handleSubmit} disabled={saving} className="bg-secondary text-white font-bold py-2 px-6 rounded-md disabled:bg-gray-400">
                            {saving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </header>
                <div className="flex-grow overflow-hidden flex">
                    <div className="w-2/3 p-4 overflow-y-auto space-y-4">
                        <input type="text" value={editedArticle.title} onChange={e => handleFieldChange('title', e.target.value)} placeholder="記事タイトル" className="w-full text-2xl font-bold p-2 border-b" />
                        <div className="relative">
                            <textarea value={editedArticle.content} onChange={e => handleFieldChange('content', e.target.value)} placeholder="記事本文 (Markdown対応)" rows={20} className="w-full p-2 border rounded-md" />
                            <AIAssistant currentValue={editedArticle.content} onUpdate={(v) => handleFieldChange('content', v)} />
                            <AIGalleryAssistant articleTitle={editedArticle.title} articleContent={editedArticle.content} onImageInsert={(url) => handleFieldChange('content', `${editedArticle.content}\n\n![画像](${url})`)} />
                        </div>
                    </div>
                    <div className="w-1/3 p-4 bg-gray-50 border-l overflow-y-auto space-y-4">
                        <div>
                            <label className="text-sm font-semibold">公開ステータス</label>
                            <div className="flex items-center gap-2 mt-1 p-2 bg-white border rounded-md">
                                <input type="checkbox" id="is_published" checked={!!editedArticle.is_published} onChange={e => handleFieldChange('is_published', e.target.checked)} />
                                <label htmlFor="is_published">{editedArticle.is_published ? '公開' : '下書き'}</label>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">スラッグ</label>
                            <input type="text" value={editedArticle.slug} onChange={e => handleFieldChange('slug', e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold">抜粋</label>
                            <textarea value={editedArticle.excerpt} onChange={e => handleFieldChange('excerpt', e.target.value)} rows={4} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                             <label className="text-sm font-semibold">アイキャッチ画像</label>
                             <div className="mt-1 p-2 bg-white border rounded-md">
                                <img src={editedArticle.image_path} alt="thumbnail" className="w-full h-32 object-cover bg-gray-100 mb-2"/>
                                <input type="file" accept="image/*" onChange={e => e.target.files && handleImageUpload(e.target.files[0])} className="text-xs" />
                             </div>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">タグ</label>
                            <div className="mt-1 p-2 bg-white border rounded-md max-h-40 overflow-y-auto">
                                {availableTags.map(tag => (
                                    <label key={tag.tagId} className="flex items-center gap-2 p-1">
                                        <input type="checkbox" checked={editedArticle.tags.includes(tag.tagId)} onChange={() => handleTagToggle(tag.tagId)} />
                                        {tag.tagName}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                 {isSeoModalOpen && (
                    <SeoAssistantModal 
                        articleData={editedArticle}
                        onUpdateField={handleFieldChange}
                        onClose={() => setIsSeoModalOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default ArticleManager;