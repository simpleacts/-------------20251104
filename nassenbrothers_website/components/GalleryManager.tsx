import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GalleryImage, GalleryTag } from '../types';

interface GalleryManagerProps {
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
            if (header === 'is_published') value = value ? '1' : '0';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    });
    return csvRows.join('\n');
};

const LockedOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
        <i className="fas fa-lock text-4xl text-gray-500 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-700">機能はロックされています</h3>
        <p className="text-gray-600">この機能の編集は現在ロックされています。</p>
        <p className="text-sm text-gray-500 mt-2">ロックを解除するには、開発ツールに移動してください。</p>
    </div>
);


const GalleryManager: React.FC<GalleryManagerProps> = ({ isLocked }) => {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [tags, setTags] = useState<GalleryTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<GalleryImage | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [imagesRes, tagsRes] = await Promise.all([
                fetch('/templates/gallery_images.csv?cachebust=' + new Date().getTime()),
                fetch('/templates/gallery_tags.csv?cachebust=' + new Date().getTime())
            ]);
            if (!imagesRes.ok || !tagsRes.ok) throw new Error('データ読み込みに失敗');
            
            const imagesCsv = await imagesRes.text();
            const tagsCsv = await tagsRes.text();

            const parsedImages = parseCsv<any>(imagesCsv).map(img => ({
                ...img, 
                tags: typeof img.tags === 'string' ? img.tags.split(',').filter(Boolean) : [],
                imageCount: parseInt(img.imageCount, 10) || 0,
                is_published: img.is_published === '1'
            }));
            setImages(parsedImages);
            setTags(parseCsv<GalleryTag>(tagsCsv));
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (updatedItems: GalleryImage[], updatedTags: GalleryTag[]) => {
        try {
            const imageCsvHeaders = ['id', 'title', 'description', 'tags', 'imageCount', 'is_published'];
            const tagCsvHeaders = ['tagId', 'tagName'];
            
            const imagesCsv = toCsv(updatedItems, imageCsvHeaders);
            const tagsCsv = toCsv(updatedTags, tagCsvHeaders);
            
            const [imagesRes, tagsRes] = await Promise.all([
                fetch('/api/save_gallery_images.php', { method: 'POST', body: imagesCsv }),
                fetch('/api/save_gallery_tags.php', { method: 'POST', body: tagsCsv })
            ]);

            if (!imagesRes.ok || !tagsRes.ok) throw new Error('保存に失敗しました。');
            
            setImages(updatedItems);
            setTags(updatedTags);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : '保存エラー');
            return false;
        }
    };
    
    const handleCreateNew = () => {
        const newItem: GalleryImage = {
            id: `g${Date.now()}`,
            title: '新規ギャラリーアイテム',
            description: '',
            tags: [],
            imageCount: 0,
            is_published: false,
        };
        setCurrentItem(newItem);
        setIsEditorOpen(true);
    };

    const handleEdit = (item: GalleryImage) => {
        setCurrentItem(item);
        setIsEditorOpen(true);
    };

    const handleDelete = async (itemId: string) => {
        if (window.confirm('このアイテムを削除しますか？')) {
            const newItems = images.filter(i => i.id !== itemId);
            await handleSave(newItems, tags);
        }
    };

    const handleSaveItem = async (itemToSave: GalleryImage, newTags: GalleryTag[]) => {
        const newItems = [...images];
        const index = newItems.findIndex(i => i.id === itemToSave.id);
        if (index > -1) {
            newItems[index] = itemToSave;
        } else {
            newItems.unshift(itemToSave);
        }
        const success = await handleSave(newItems, newTags);
        if (success) {
            setIsEditorOpen(false);
            setCurrentItem(null);
        }
    };

    if (loading) return <div className="p-8"><i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...</div>;
    if (error) return <div className="p-8 text-red-600">エラー: {error}</div>;

    return (
        <div className="relative h-full">
            {isLocked && <LockedOverlay />}
            <div className="bg-white p-4 border-b sticky top-0 z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">ギャラリー管理</h2>
                    <p className="text-sm text-gray-500">制作実績などを管理します。</p>
                </div>
                <button onClick={handleCreateNew} className="bg-primary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors hover:bg-primary/90">
                    <i className="fas fa-plus mr-2"></i>新規作成
                </button>
            </div>
            
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map(item => (
                    <div key={item.id} className="bg-white border rounded-lg shadow-sm group relative">
                        <div className="aspect-square bg-gray-100">
                             <img src={`./images/gallery/${item.id}/1.jpg`} alt={item.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300?text=No+Image'; }} />
                        </div>
                        <div className="p-3">
                            <p className="font-semibold truncate">{item.title}</p>
                            <span className={`text-xs ${item.is_published ? 'text-green-600' : 'text-gray-500'}`}>{item.is_published ? '公開' : '下書き'}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(item)} className="bg-white text-gray-800 h-10 w-10 rounded-full shadow-lg"><i className="fas fa-pen"></i></button>
                            <button onClick={() => handleDelete(item.id)} className="bg-white text-accent h-10 w-10 rounded-full shadow-lg"><i className="fas fa-trash"></i></button>
                        </div>
                    </div>
                ))}
            </div>

            {isEditorOpen && currentItem && (
                <GalleryEditor
                    item={currentItem}
                    allTags={tags}
                    onSave={handleSaveItem}
                    onClose={() => setIsEditorOpen(false)}
                />
            )}
        </div>
    );
};

// Editor Modal
const GalleryEditor: React.FC<{
    item: GalleryImage;
    allTags: GalleryTag[];
    onSave: (item: GalleryImage, newTags: GalleryTag[]) => Promise<void>;
    onClose: () => void;
}> = ({ item, allTags, onSave, onClose }) => {
    const [editedItem, setEditedItem] = useState<GalleryImage>(item);
    const [availableTags, setAvailableTags] = useState<GalleryTag[]>(allTags);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [previews, setPreviews] = useState<string[]>([]);
    
    useEffect(() => {
        const existingPreviews = Array.from({ length: item.imageCount }, (_, i) => `./images/gallery/${item.id}/${i + 1}.jpg?t=${Date.now()}`);
        setPreviews(existingPreviews);
    }, [item]);

    const handleFieldChange = (field: keyof GalleryImage, value: any) => {
        setEditedItem(prev => ({ ...prev, [field]: value }));
    };
    
    const handleUpload = async (files: FileList) => {
        if (!files.length) return;
        setUploading(true);
        setError('');
        const folder = `images/gallery/${editedItem.id}`;
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('assetFile', file);
                formData.append('folder', folder);
                const res = await fetch('/api/upload_asset.php', { method: 'POST', body: formData });
                const result = await res.json();
                if (!res.ok || !result.success) throw new Error(result.message);
                
                // Refresh previews after upload
                const newPreviews = Array.from({ length: editedItem.imageCount + 1 }, (_, i) => `./images/gallery/${editedItem.id}/${i + 1}.jpg?t=${Date.now()}`);
                setPreviews(newPreviews);
                handleFieldChange('imageCount', editedItem.imageCount + 1);
            }
        } catch(e) { setError('アップロード失敗: ' + (e as Error).message); }
        finally { setUploading(false); }
    };
    
    const handleSubmit = async () => {
        setSaving(true);
        await onSave(editedItem, availableTags);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-3xl h-[95vh] flex flex-col rounded-lg">
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">ギャラリーエディタ</h3>
                    <div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 mr-4">キャンセル</button>
                        <button onClick={handleSubmit} disabled={saving} className="bg-secondary text-white font-bold py-2 px-6 rounded-md disabled:bg-gray-400">{saving ? '保存中...' : '保存'}</button>
                    </div>
                </header>
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    <input type="text" value={editedItem.title} onChange={e => handleFieldChange('title', e.target.value)} placeholder="タイトル" className="w-full text-xl font-bold p-2 border-b" />
                    <textarea value={editedItem.description} onChange={e => handleFieldChange('description', e.target.value)} placeholder="説明文" rows={4} className="w-full p-2 border rounded-md" />
                    <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded-md">
                        <input type="checkbox" id="is_published" checked={!!editedItem.is_published} onChange={e => handleFieldChange('is_published', e.target.checked)} />
                        <label htmlFor="is_published">{editedItem.is_published ? '公開' : '下書き'}</label>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-2">画像</h4>
                        <div className="p-4 border-2 border-dashed rounded-md text-center">
                            <input type="file" multiple onChange={e => e.target.files && handleUpload(e.target.files)} className="text-sm mb-2" />
                            {uploading && <p className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>アップロード中...</p>}
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {previews.map((src, i) => <img key={i} src={src} className="w-full h-24 object-cover" />)}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
};


export default GalleryManager;