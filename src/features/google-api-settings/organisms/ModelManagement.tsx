import React, { useEffect, useState } from 'react';
import { Database, Row } from '@shared/types';
import { Button, CheckIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@components/atoms';

interface ModelManagementProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const ModelManagement: React.FC<ModelManagementProps> = ({ database, setDatabase }) => {
    const [models, setModels] = useState<Row[]>([]);
    const [editingModelId, setEditingModelId] = useState<string | null>(null);
    const [editedModel, setEditedModel] = useState<Partial<Row>>({});
    
    useEffect(() => {
        setModels(database.gemini_models?.data || []);
    }, [database.gemini_models]);
    
    const handleSave = () => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            newDb.gemini_models.data = models;
            return newDb;
        });
        alert('モデル情報を保存しました。');
    };

    const handleAddModel = () => {
        const newModel = { id: `gem_${Date.now()}`, model_name: '', display_name: '', status: 'active', description: '' };
        setModels(prev => [...prev, newModel]);
        setEditingModelId(newModel.id);
        setEditedModel(newModel);
    };

    const handleEdit = (model: Row) => {
        setEditingModelId(model.id);
        setEditedModel(model);
    };
    
    const handleSaveEdit = () => {
        if (!editedModel.model_name || !editedModel.display_name) {
            alert('モデル名と表示名は必須です。');
            return;
        }
        setModels(prev => prev.map(m => m.id === editingModelId ? editedModel : m));
        setEditingModelId(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('このモデルを削除しますか？')) {
            setModels(prev => prev.filter(m => m.id !== id));
        }
    };
    
    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Geminiモデル管理</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleAddModel}><PlusIcon className="w-4 h-4 mr-1"/>モデルを追加</Button>
                    <Button onClick={handleSave}>保存</Button>
                </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">アプリケーションで使用するGeminiモデルのリストを管理します。</p>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-base-200 dark:bg-base-dark-300">
                        <tr>
                            <th className="p-2 text-left">モデル名 (API)</th>
                            <th className="p-2 text-left">表示名</th>
                            <th className="p-2 text-left">ステータス</th>
                            <th className="p-2 text-left">説明</th>
                            <th className="p-2">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {models.map(model => (
                            editingModelId === model.id ? (
                                <tr key={model.id} className="bg-yellow-50 dark:bg-yellow-900/20">
                                    <td className="p-1"><input value={editedModel.model_name || ''} onChange={e => setEditedModel(m=>({...m, model_name: e.target.value}))} className="w-full p-1 border rounded"/></td>
                                    <td className="p-1"><input value={editedModel.display_name || ''} onChange={e => setEditedModel(m=>({...m, display_name: e.target.value}))} className="w-full p-1 border rounded"/></td>
                                    <td className="p-1"><select value={editedModel.status || 'active'} onChange={e => setEditedModel(m=>({...m, status: e.target.value}))} className="w-full p-1 border rounded"><option value="active">Active</option><option value="preview">Preview</option><option value="deprecated">Deprecated</option></select></td>
                                    <td className="p-1"><input value={editedModel.description || ''} onChange={e => setEditedModel(m=>({...m, description: e.target.value}))} className="w-full p-1 border rounded"/></td>
                                    <td className="p-1 text-center"><Button variant="ghost" size="sm" onClick={handleSaveEdit}><CheckIcon className="w-4 h-4 text-green-600"/></Button><Button variant="ghost" size="sm" onClick={() => setEditingModelId(null)}><XMarkIcon className="w-4 h-4"/></Button></td>
                                </tr>
                            ) : (
                                <tr key={model.id} className="border-t">
                                    <td className="p-2 font-mono">{model.model_name}</td>
                                    <td className="p-2 font-semibold">{model.display_name}</td>
                                    <td className="p-2">{model.status}</td>
                                    <td className="p-2 text-xs text-gray-500">{model.description}</td>
                                    <td className="p-2 text-center"><Button variant="ghost" size="sm" onClick={() => handleEdit(model)}><PencilIcon className="w-4 h-4"/></Button><Button variant="ghost" size="sm" onClick={() => handleDelete(model.id)}><TrashIcon className="w-4 h-4"/></Button></td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ModelManagement;
