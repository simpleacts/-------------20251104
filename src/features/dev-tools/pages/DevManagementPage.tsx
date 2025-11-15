
import MarkdownIt from 'markdown-it';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase } from '@core/utils';
import { generateDevelopmentTasks } from '@shared/services/geminiService';
import { Database, DevRoadmapItem, GuidelineItem, Row } from '@shared/types';
import { Button, CheckIcon, ClipboardDocumentCheckIcon, DownloadIcon, PencilIcon, PlusIcon, SparklesIcon, SpinnerIcon, TrashIcon, XMarkIcon, Input, Select } from '@components/atoms';


const md = new MarkdownIt({ html: true, linkify: true, breaks: true });


// --- GuidelineItemEditor Component ---
const GuidelineItemEditor: React.FC<{
    item: GuidelineItem;
    onUpdate: (id: string, updatedItem: Omit<GuidelineItem, 'id'>) => void;
    onDelete: (id: string) => void;
}> = ({ item, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(!item.title && !item.content);
    const [editItem, setEditItem] = useState(item);

    useEffect(() => {
        setEditItem(item);
        if (!item.title && !item.content) {
            setIsEditing(true);
        }
    }, [item]);

    const handleSave = () => {
        if (!editItem.title.trim()) {
            alert('タイトルは必須です。');
            return;
        }
        onUpdate(item.id, { title: editItem.title, content: editItem.content });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditItem(item); // 変更をリセット
        setIsEditing(false);
        if (!item.title && !item.content) {
            onDelete(item.id);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md border-2 border-brand-primary">
                <input
                    type="text"
                    value={editItem.title}
                    onChange={e => setEditItem(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="タイトル"
                    className="w-full text-lg font-bold p-2 border rounded mb-2 bg-base-200 dark:bg-base-dark-300"
                />
                <textarea
                    value={editItem.content}
                    onChange={e => setEditItem(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    placeholder="内容 (Markdown対応)"
                    className="w-full p-2 border rounded font-mono text-xs bg-base-200 dark:bg-base-dark-300"
                />
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={handleCancel} className="p-2 text-gray-500 hover:text-gray-700 rounded-full"><XMarkIcon className="w-5 h-5"/></button>
                    <button onClick={handleSave} className="p-2 text-green-600 hover:text-green-800 rounded-full"><CheckIcon className="w-5 h-5"/></button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-start">
                <h4 className="text-lg font-bold">{item.title}</h4>
                <div className="flex gap-2">
                    <button onClick={() => setIsEditing(true)} className="p-1 text-blue-500 hover:text-blue-700"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(item.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <div
                className="prose prose-sm dark:prose-invert max-w-none mt-2 prose-headings:my-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                dangerouslySetInnerHTML={{ __html: md.render(item.content) }}
            />
        </div>
    );
};

// --- ProjectModal Component ---
const ProjectModal: React.FC<{
    project: DevRoadmapItem;
    tasks: DevRoadmapItem[];
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<DevRoadmapItem>) => void;
    onDelete: (id: string) => void;
    onAddTask: (projectId: string) => void;
}> = ({ project, tasks, onClose, onUpdate, onDelete, onAddTask }) => {
    const [copied, setCopied] = useState(false);
    
    const handleDeleteProject = () => {
        if (window.confirm(`案件「${project.title}」を削除しますか？関連するタスクもすべて削除されます。`)) {
            onDelete(project.id);
            onClose();
        }
    };
    
    const handleCopyInstructions = () => {
        if (project.instructions) {
            navigator.clipboard.writeText(project.instructions);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <input type="text" value={project.title} onChange={e => onUpdate(project.id, { title: e.target.value })} className="text-xl font-bold bg-transparent p-1 -m-1 w-full focus:outline-none focus:ring-1 focus:ring-brand-secondary rounded"/>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="text-sm font-semibold">説明</label>
                        <textarea value={project.description} onChange={e => onUpdate(project.id, { description: e.target.value })} rows={4} className="w-full p-2 mt-1 border rounded bg-base-200 dark:bg-base-dark-300"/>
                    </div>
                    {project.instructions && (
                        <div>
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold">指示文</label>
                                <button onClick={handleCopyInstructions} className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                                    {copied ? <CheckIcon className="w-3 h-3"/> : <ClipboardDocumentCheckIcon className="w-3 h-3" />}
                                    {copied ? 'コピーしました' : 'コピー'}
                                </button>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none mt-2 p-2 border rounded bg-gray-50 dark:bg-gray-800/50" dangerouslySetInnerHTML={{ __html: md.render(project.instructions) }}/>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-semibold mb-2">タスク一覧</h4>
                        <div className="space-y-2">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 p-2 bg-base-200 dark:bg-base-dark-300 rounded">
                                    <input type="checkbox" checked={task.status === 'done'} onChange={() => onUpdate(task.id, { status: task.status === 'done' ? 'in_progress' : 'done' })} />
                                    <input type="text" value={task.title} onChange={e => onUpdate(task.id, { title: e.target.value })} className={`flex-grow bg-transparent p-1 -m-1 focus:outline-none focus:ring-1 focus:ring-brand-secondary rounded text-sm ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}/>
                                    <button onClick={() => onDelete(task.id)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => onAddTask(project.id)} className="mt-2 text-sm text-blue-600 flex items-center gap-1"><PlusIcon className="w-4 h-4"/>タスクを追加</button>
                    </div>
                </main>
                <footer className="p-4 border-t border-base-300 dark:border-base-dark-300 flex justify-end">
                     <button onClick={handleDeleteProject} className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-md">
                        <TrashIcon className="w-4 h-4"/> この案件を削除
                    </button>
                </footer>
            </div>
        </div>
    );
};

// --- MenuGroupEditor Component ---
const MenuGroupEditor: React.FC<{
    groups: Row[];
    setGroups: React.Dispatch<React.SetStateAction<Row[]>>;
}> = ({ groups, setGroups }) => {
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editedGroup, setEditedGroup] = useState<Partial<Row>>({});

    const handleStartEdit = (group: Row) => {
        setEditingGroupId(group.id);
        setEditedGroup(group);
    };

    const handleCancelEdit = () => {
        setEditingGroupId(null);
        setEditedGroup({});
    };

    const handleSaveEdit = () => {
        setGroups(prev => prev.map(g => g.id === editingGroupId ? editedGroup : g));
        handleCancelEdit();
    };

    const handleDelete = (id: string) => {
        if (window.confirm("このグループを削除しますか？グループ内のツールは「その他」に移動します。")) {
            setGroups(prev => prev.filter(g => g.id !== id));
        }
    };

    const handleAddGroup = () => {
        const newGroup = {
            id: `grp_${Date.now()}`,
            type: 'group',
            japaneseName: '新しいグループ',
            icon_name: 'fa-folder',
            sort_order: (Math.max(0, ...groups.map(g => g.sort_order || 0)) + 10),
        };
        setGroups(prev => [...prev, newGroup]);
        setEditingGroupId(newGroup.id);
        setEditedGroup(newGroup);
    };

    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-end mb-4">
                <Button onClick={handleAddGroup} variant="secondary"><PlusIcon className="w-4 h-4 mr-2"/>新規グループを追加</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-base-200 dark:bg-base-dark-300">
                        <tr>
                            <th className="p-2 text-left">表示順</th>
                            <th className="p-2 text-left">グループ名</th>
                            <th className="p-2 text-left">アイコン名 (Font Awesome)</th>
                            <th className="p-2 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(group => (
                            editingGroupId === group.id ? (
                                <tr key={group.id} className="bg-yellow-50 dark:bg-yellow-900/20">
                                    <td className="p-1 w-24"><Input type="number" value={editedGroup.sort_order || ''} onChange={e => setEditedGroup(g => ({...g, sort_order: +e.target.value}))} /></td>
                                    <td className="p-1"><Input value={editedGroup.japaneseName || ''} onChange={e => setEditedGroup(g => ({...g, japaneseName: e.target.value}))} /></td>
                                    <td className="p-1"><Input value={editedGroup.icon_name || ''} onChange={e => setEditedGroup(g => ({...g, icon_name: e.target.value}))} placeholder="例: fa-star" /></td>
                                    <td className="p-1 text-right whitespace-nowrap">
                                        <Button variant="ghost" size="sm" onClick={handleSaveEdit}><CheckIcon className="w-4 h-4 text-green-600"/></Button>
                                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}><XMarkIcon className="w-4 h-4"/></Button>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={group.id} className="border-t">
                                    <td className="p-2">{group.sort_order}</td>
                                    <td className="p-2 font-semibold">{group.japaneseName}</td>
                                    <td className="p-2 font-mono text-xs">{group.icon_name}</td>
                                    <td className="p-2 text-right whitespace-nowrap">
                                        <Button variant="ghost" size="sm" onClick={() => handleStartEdit(group)}><PencilIcon className="w-4 h-4"/></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id as string)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- ToolAssignmentEditor Component ---
const ToolAssignmentEditor: React.FC<{
    database: Database;
    assignments: Record<string, string>;
    onAssignmentChange: (toolPage: string, newGroup: string) => void;
}> = ({ database, assignments, onAssignmentChange }) => {
    
    const allTools = useMemo(() =>
        (database.modules_core?.data || [])
            .filter(row => row.type !== 'group' && row.page)
            .map(tool => ({
                id: tool.id,
                page: tool.page,
                japaneseName: tool.japaneseName || tool.fileName,
                sort_order: tool.sort_order || 999
            }))
            .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)),
        [database.modules_core]
    );

    const menuGroups = useMemo(() => 
        (database.modules_core?.data || [])
            .filter(row => row.type === 'group')
            .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)),
        [database.modules_core]
    );

    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md mt-4">
            <p className="text-sm text-gray-500 mb-4">各ツールがサイドバーのどのグループに表示されるかを設定します。</p>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-base-200 dark:bg-base-dark-300">
                        <tr>
                            <th className="p-2 text-left">ツール名</th>
                            <th className="p-2 text-left">所属グループ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allTools.map(tool => (
                            <tr key={tool.id} className="border-t">
                                <td className="p-2 font-semibold">{tool.japaneseName}</td>
                                <td className="p-2">
                                    <Select 
                                        value={assignments[tool.page as string] || 'その他'}
                                        onChange={e => onAssignmentChange(tool.page as string, e.target.value)}
                                    >
                                        {menuGroups.map(group => (
                                            <option key={group.id} value={group.japaneseName}>{group.japaneseName}</option>
                                        ))}
                                        <option value="その他">その他</option>
                                    </Select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DevManagementTool: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState('roadmap');
    
    // States for each tab
    const [roadmapItems, setRoadmapItems] = useState<DevRoadmapItem[]>([]);
    const [initialRoadmapItems, setInitialRoadmapItems] = useState<DevRoadmapItem[]>([]);
    const [selectedProject, setSelectedProject] = useState<DevRoadmapItem | null>(null);

    const [constitutionItems, setConstitutionItems] = useState<GuidelineItem[]>([]);
    const [initialConstitutionItems, setInitialConstitutionItems] = useState<GuidelineItem[]>([]);
    
    const [guidelines, setGuidelines] = useState<Record<'recommended' | 'prohibited', GuidelineItem[]>>({ recommended: [], prohibited: [] });
    const [initialGuidelines, setInitialGuidelines] = useState<Record<'recommended' | 'prohibited', GuidelineItem[]>>({ recommended: [], prohibited: [] });

    const [ideaText, setIdeaText] = useState('');
    const [aiResult, setAiResult] = useState<{ feasibility?: string; summary: string; tasks_markdown: string; } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const [menuGroups, setMenuGroups] = useState<Row[]>([]);
    const [initialMenuGroups, setInitialMenuGroups] = useState<Row[]>([]);

    const [toolAssignments, setToolAssignments] = useState<Record<string, string>>({});
    const [initialToolAssignments, setInitialToolAssignments] = useState<Record<string, string>>({});
    
    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const requiredTables = ['dev_roadmap', 'dev_constitution', 'dev_guidelines_recommended', 'dev_guidelines_prohibited', 'modules_core', 'modules_page_tool'];
                const missingTables = requiredTables.filter(t => !database[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'dev-management' });
                    setDatabase(prev => ({ ...(prev || {}), ...data }));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [database, setDatabase]);

    useEffect(() => {
        if (database) {
            const sortedRoadmap = (database.dev_roadmap?.data as DevRoadmapItem[] || []).sort((a, b) => (a.priority || 999) - (b.priority || 999));
            setRoadmapItems(sortedRoadmap);
            setInitialRoadmapItems(sortedRoadmap);

            const constItems = (database.dev_constitution?.data as GuidelineItem[]) || [];
            setConstitutionItems(constItems);
            setInitialConstitutionItems(constItems);

            const guideItems = {
                recommended: (database.dev_guidelines_recommended?.data as GuidelineItem[]) || [],
                prohibited: (database.dev_guidelines_prohibited?.data as GuidelineItem[]) || [],
            };
            setGuidelines(guideItems);
            setInitialGuidelines(guideItems);

            if (database.modules_core) {
                const groupData = database.modules_core.data.filter(row => row.type === 'group').sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
                setMenuGroups(groupData);
                setInitialMenuGroups(groupData);

                const initialAssignments = (database.modules_core.data as any[]).filter(row => row.type !== 'group' && row.page).reduce((acc, tool) => {
                    acc[tool.page] = tool.group_name || 'その他';
                    return acc;
                }, {} as Record<string, string>);
                setToolAssignments(initialAssignments);
                setInitialToolAssignments(initialAssignments);
            }
        }
    }, [database]);
    
    const hasChanges = useMemo(() => {
        switch (activeTab) {
            case 'roadmap': return JSON.stringify(roadmapItems) !== JSON.stringify(initialRoadmapItems);
            case 'constitution': return JSON.stringify(constitutionItems) !== JSON.stringify(initialConstitutionItems);
            case 'guidelines_recommended':
            case 'guidelines_prohibited': return JSON.stringify(guidelines) !== JSON.stringify(initialGuidelines);
            case 'menu_groups': return JSON.stringify(menuGroups) !== JSON.stringify(initialMenuGroups);
            case 'tool_assignment': return JSON.stringify(toolAssignments) !== JSON.stringify(initialToolAssignments);
            default: return false;
        }
    }, [activeTab, roadmapItems, initialRoadmapItems, constitutionItems, initialConstitutionItems, guidelines, initialGuidelines, menuGroups, initialMenuGroups, toolAssignments, initialToolAssignments]);

    const handleSave = async () => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            if (activeTab === 'roadmap') {
                newDb.dev_roadmap.data = roadmapItems;
            } else if (activeTab === 'constitution') {
                newDb.dev_constitution.data = constitutionItems;
            } else if (activeTab === 'guidelines_recommended' || activeTab === 'guidelines_prohibited') {
                newDb.dev_guidelines_recommended.data = guidelines.recommended;
                newDb.dev_guidelines_prohibited.data = guidelines.prohibited;
            } else if (activeTab === 'menu_groups') {
                const otherModules = newDb.modules_core.data.filter((r: Row) => r.type !== 'group');
                newDb.modules_core.data = [...otherModules, ...menuGroups];
            } else if (activeTab === 'tool_assignment') {
                newDb.modules_core.data.forEach((row: Row) => {
                    if (row.type !== 'group' && row.page && toolAssignments[row.page] !== undefined) {
                        row.group_name = toolAssignments[row.page];
                    }
                });
            }
            return newDb;
        });

        // サーバーに保存（簡略化版：全データを置き換え）
        try {
            let tableName: string;
            let operations: any[];

            if (activeTab === 'roadmap') {
                tableName = 'dev_roadmap';
                // 既存データを削除してから新しいデータを追加
                const existingIds = (database.dev_roadmap?.data || []).map((r: Row) => r.id);
                operations = [
                    ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                    ...roadmapItems.map(item => ({ type: 'INSERT' as const, data: item }))
                ];
            } else if (activeTab === 'constitution') {
                tableName = 'dev_constitution';
                const existingIds = (database.dev_constitution?.data || []).map((r: Row) => r.id);
                operations = [
                    ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                    ...constitutionItems.map(item => ({ type: 'INSERT' as const, data: item }))
                ];
            } else if (activeTab === 'guidelines_recommended') {
                tableName = 'dev_guidelines_recommended';
                const existingIds = (database.dev_guidelines_recommended?.data || []).map((r: Row) => r.id);
                operations = [
                    ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                    ...guidelines.recommended.map(item => ({ type: 'INSERT' as const, data: item }))
                ];
            } else if (activeTab === 'guidelines_prohibited') {
                tableName = 'dev_guidelines_prohibited';
                const existingIds = (database.dev_guidelines_prohibited?.data || []).map((r: Row) => r.id);
                operations = [
                    ...existingIds.map(id => ({ type: 'DELETE' as const, where: { id } })),
                    ...guidelines.prohibited.map(item => ({ type: 'INSERT' as const, data: item }))
                ];
            } else if (activeTab === 'menu_groups') {
                tableName = 'modules_core';
                // 既存のグループを削除してから新しいグループを追加
                const existingGroups = (database.modules_core?.data || []).filter((r: Row) => r.type === 'group');
                const existingGroupIds = existingGroups.map((r: Row) => r.id);
                operations = [
                    ...existingGroupIds.map(id => ({ type: 'DELETE' as const, where: { id, type: 'group' } })),
                    ...menuGroups.map(item => ({ type: 'INSERT' as const, data: item }))
                ];
            } else if (activeTab === 'tool_assignment') {
                tableName = 'modules_core';
                // tool_assignmentは既存のmodules_coreデータを更新するだけ
                operations = (database.modules_core?.data || [])
                    .filter((row: Row) => row.type !== 'group' && row.page && toolAssignments[row.page as string] !== undefined)
                    .map((row: Row) => ({
                        type: 'UPDATE' as const,
                        data: { group_name: toolAssignments[row.page as string] },
                        where: { id: row.id }
                    }));
            } else {
                return;
            }

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, tableName, operations, database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to save ${activeTab} to server`);
                }
            }

            // 成功メッセージ
            if (activeTab === 'roadmap') {
                setInitialRoadmapItems(roadmapItems);
                alert('ロードマップを保存しました。');
            } else if (activeTab === 'constitution') {
                setInitialConstitutionItems(constitutionItems);
                alert('開発憲法を保存しました。');
            } else if (activeTab === 'guidelines_recommended' || activeTab === 'guidelines_prohibited') {
                setInitialGuidelines(guidelines);
                alert('開発ガイドラインを保存しました。');
            } else if (activeTab === 'menu_groups') {
                setInitialMenuGroups(menuGroups);
                alert('メニューグループを保存しました。');
            } else if (activeTab === 'tool_assignment') {
                setInitialToolAssignments(toolAssignments);
                alert('ツール所属設定を保存しました。');
            }
        } catch (error) {
            console.error(`[DevManagement] Failed to save ${activeTab} to server:`, error);
            alert(`サーバーへの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleDownloadForSystemInstruction = () => {
        if (!database) return;
    
        const tablesToExport: { name: string, displayName: string }[] = [
            { name: 'dev_constitution', displayName: '開発憲法' },
            { name: 'dev_guidelines_recommended', displayName: '推奨仕様' },
            { name: 'dev_guidelines_prohibited', displayName: '禁止事項' },
        ];
    
        let outputText = '';
    
        tablesToExport.forEach(tableInfo => {
            outputText += `== ${tableInfo.displayName} ==\n\n`;
            const tableData = (database[tableInfo.name]?.data as GuidelineItem[]) || [];
            if (tableData.length > 0) {
                tableData.forEach(item => {
                    outputText += `■ ${item.title}\n`;
                    outputText += `${item.content}\n\n`;
                    outputText += '---\n\n';
                });
            } else {
                outputText += '項目がありません。\n\n';
            }
        });
    
        const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'system_instruction_prompt.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    // --- Roadmap Logic ---
    const { projects, tasksByProjectId } = useMemo(() => {
        const projects = roadmapItems.filter(item => !item.parent_id);
        const tasks = roadmapItems.filter(item => item.parent_id);
        const tasksByProjectId = tasks.reduce((acc, task) => {
            const parentId = task.parent_id!;
            if (!acc[parentId]) acc[parentId] = [];
            acc[parentId].push(task);
            return acc;
        }, {} as Record<string, DevRoadmapItem[]>);
        return { projects, tasksByProjectId };
    }, [roadmapItems]);

    const roadmapByStatus = useMemo(() => {
        const grouped: Record<string, DevRoadmapItem[]> = { backlog: [], todo: [], in_progress: [], done: [] };
        projects.forEach(project => {
            if (grouped[project.status]) {
                grouped[project.status].push(project);
            }
        });
        return grouped;
    }, [projects]);
    
    const handleRoadmapUpdate = useCallback((id: string, updates: Partial<DevRoadmapItem>) => {
        setRoadmapItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } as DevRoadmapItem : item));
    }, []); // setRoadmapItems is stable

    const handleAddProject = () => {
        const newProject: DevRoadmapItem = {
            id: `proj_${Date.now()}`, title: '新規案件', description: '',
            status: 'backlog', created_at: new Date().toISOString(), completed_at: null,
            type: 'feature', priority: 999,
        };
        setRoadmapItems(prev => [...prev, newProject]);
    };
    
    const handleDeleteRoadmapItem = (id: string) => {
        setRoadmapItems(prev => prev.filter(item => item.id !== id && item.parent_id !== id));
    };

    const handleAddTask = (projectId: string) => {
        const newTask: DevRoadmapItem = {
            id: `task_${Date.now()}`, parent_id: projectId, title: '新規タスク',
            description: '', status: 'todo', created_at: new Date().toISOString(),
            completed_at: null, type: 'chore', priority: 999,
        };
        setRoadmapItems(prev => [...prev, newTask]);
    };

    const handleDragStart = (e: React.DragEvent, itemId: string) => e.dataTransfer.setData('itemId', itemId);
    
    const handleDrop = useCallback((e: React.DragEvent, newStatus: DevRoadmapItem['status']) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('itemId');
        const updates: Partial<DevRoadmapItem> = { status: newStatus };
        if (newStatus === 'done') {
            updates.completed_at = new Date().toISOString();
        }
        handleRoadmapUpdate(itemId, updates);
    }, [handleRoadmapUpdate]);
    
    // --- Constitution Logic ---
    const handleConstitutionUpdate = useCallback((id: string, updatedItem: Omit<GuidelineItem, 'id'>) => {
        setConstitutionItems(prev => prev.map(item => item.id === id ? { id, ...updatedItem } : item));
    }, []);

    const handleConstitutionDelete = useCallback((id: string) => {
        if (window.confirm('この項目を削除しますか？')) {
            setConstitutionItems(prev => prev.filter(item => item.id !== id));
        }
    }, []);

    const handleAddConstitutionItem = () => {
        const newItem: GuidelineItem = { id: `new_constitution_${Date.now()}`, title: '', content: '' };
        setConstitutionItems(prev => [...prev, newItem]);
    };

    // --- Guideline Logic ---
    const handleGuidelineUpdate = useCallback((type: 'recommended' | 'prohibited', id: string, updatedItem: Omit<GuidelineItem, 'id'>) => {
        setGuidelines(prev => ({ ...prev, [type]: prev[type].map(item => item.id === id ? { id, ...updatedItem } : item) }));
    }, []);

    const handleGuidelineDelete = useCallback((type: 'recommended' | 'prohibited', id: string) => {
        if (window.confirm('この項目を削除しますか？')) {
            setGuidelines(prev => ({ ...prev, [type]: prev[type].filter(item => item.id !== id) }));
        }
    }, []);
    
    const handleAddGuideline = (type: 'recommended' | 'prohibited') => {
        const newItem: GuidelineItem = { id: `new_${type}_${Date.now()}`, title: '', content: '' };
        setGuidelines(prev => ({ ...prev, [type]: [...prev[type], newItem] }));
    };
    
    // --- AI Task Generation Logic ---
    const handleGenerateTasks = async () => {
        if (!ideaText.trim()) return;
        setIsGenerating(true); setAiResult(null);
        try {
            const result = await generateDevelopmentTasks(ideaText);
            setAiResult(result);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'タスクの生成に失敗しました。');
        } finally { setIsGenerating(false); }
    };
    
    const handleCopyMarkdown = () => {
        if (aiResult?.tasks_markdown) {
            navigator.clipboard.writeText(aiResult.tasks_markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // --- RENDER FUNCTIONS ---
    const renderContent = () => {
        switch (activeTab) {
            case 'roadmap': return renderRoadmap();
            case 'menu_groups': return <MenuGroupEditor groups={menuGroups} setGroups={setMenuGroups} />;
            case 'tool_assignment': return <ToolAssignmentEditor database={database as Database} assignments={toolAssignments} onAssignmentChange={(toolPage, newGroup) => setToolAssignments(prev => ({...prev, [toolPage]: newGroup}))} />;
            case 'constitution': return renderConstitution();
            case 'guidelines_recommended': return renderGuidelines('recommended');
            case 'guidelines_prohibited': return renderGuidelines('prohibited');
            case 'ai-task-gen': return renderAITaskGenerator();
            default: return null;
        }
    };
    
    const renderRoadmap = () => {
        const statuses: { id: DevRoadmapItem['status']; title: string }[] = [ { id: 'backlog', title: 'バックログ' }, { id: 'todo', title: 'ToDo' }, { id: 'in_progress', title: '進行中' }, { id: 'done', title: '完了' }, ];
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statuses.map(status => (
                    <div key={status.id} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, status.id)} className="bg-gray-100 dark:bg-base-dark-300 rounded-lg p-3">
                        <h3 className="font-bold mb-3 text-center">{status.title} ({roadmapByStatus[status.id].length})</h3>
                        <div className="space-y-3 min-h-[100px]">
                            {roadmapByStatus[status.id].map(project => {
                                const projectTasks = tasksByProjectId[project.id] || [];
                                const completedTasks = projectTasks.filter(t => t.status === 'done').length;
                                return (
                                    <div key={project.id} draggable onDragStart={e => handleDragStart(e, project.id)} onClick={() => setSelectedProject(project)} className="p-3 bg-base-100 dark:bg-base-dark-200 rounded-lg shadow cursor-pointer hover:shadow-lg active:cursor-grabbing">
                                        <p className="font-semibold text-sm">{project.title}</p>
                                        {projectTasks.length > 0 && (
                                            <div className="mt-2 text-xs flex justify-between items-center"><span>タスク: {completedTasks}/{projectTasks.length}</span><div className="w-1/2 bg-gray-300 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(completedTasks/projectTasks.length)*100}%`}}></div></div></div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderConstitution = () => (
        <div className="space-y-4">
            <div className="flex justify-end"><Button onClick={handleAddConstitutionItem} variant="secondary"><PlusIcon className="w-4 h-4 mr-2"/>項目を追加</Button></div>
            {constitutionItems.map(item => <GuidelineItemEditor key={item.id} item={item} onUpdate={handleConstitutionUpdate} onDelete={handleConstitutionDelete} />)}
        </div>
    );
    
    const renderGuidelines = (type: 'recommended' | 'prohibited') => {
        const items = guidelines[type];
        return (
            <div className="space-y-4">
                <div className="flex justify-end"><Button onClick={() => handleAddGuideline(type)} variant="secondary"><PlusIcon className="w-4 h-4 mr-2"/>項目を追加</Button></div>
                {items.map(item => <GuidelineItemEditor key={item.id} item={item} onUpdate={(id, updated) => handleGuidelineUpdate(type, id, updated)} onDelete={(id) => handleGuidelineDelete(type, id)} />)}
            </div>
        );
    };

    const renderAITaskGenerator = () => (
         <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
                <div><label htmlFor="idea-textarea" className="block text-lg font-bold mb-2">新しい機能のアイデアや修正依頼を入力</label><textarea id="idea-textarea" value={ideaText} onChange={(e) => setIdeaText(e.target.value)} placeholder="例: 「顧客管理ツールに、最終注文日と合計注文金額を表示する機能を追加してほしい。一覧画面でソートもできるようにしてほしい。」" rows={5} className="w-full p-3 border rounded-lg bg-base-200 dark:bg-base-dark-300"/></div>
                <button onClick={handleGenerateTasks} disabled={isGenerating || !ideaText.trim()} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400">
                    {isGenerating ? <SpinnerIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5" />} {isGenerating ? 'タスクを生成中...' : 'AIで開発タスクを生成'}
                </button>
            </div>
            {aiResult && (
                <div className="mt-8 p-6 bg-base-200 dark:bg-base-dark-300 rounded-lg">
                    <h3 className="text-xl font-bold mb-4">AIによる分析・タスク提案</h3>
                    <div className="space-y-6">
                        {aiResult.feasibility && (<div><h4 className="font-semibold">実現可能性の評価</h4><p className="text-sm mt-1">{aiResult.feasibility}</p></div>)}
                        <div><h4 className="font-semibold">アイデアの要約</h4><p className="text-sm mt-1">{aiResult.summary}</p></div>
                        <div>
                            <div className="flex justify-between items-center"><h4 className="font-semibold">提案された開発タスク (Markdown)</h4><button onClick={handleCopyMarkdown} className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">{copied ? <CheckIcon className="w-4 h-4"/> : <ClipboardDocumentCheckIcon className="w-4 h-4" />}{copied ? 'コピーしました' : 'コピー'}</button></div>
                            <div className="mt-2 p-4 border rounded-lg bg-base-100 dark:bg-base-dark-200 max-h-96 overflow-y-auto"><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: md.render(aiResult.tasks_markdown) }} /></div>
                        </div>
                    </div>
                </div>
            )}
         </div>
    );
    
    if (isLoading) return <div className="flex h-full w-full items-center justify-center"><SpinnerIcon className="w-12 h-12 text-brand-primary" /></div>;
    if (error) return <div className="text-red-600 p-4">{error}</div>;

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div><h1 className="text-3xl font-bold">開発管理ツール</h1><p className="text-gray-500 mt-1">ロードマップ、ガイドライン、タスク生成を管理します。</p></div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDownloadForSystemInstruction} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2"><DownloadIcon className="w-5 h-5"/>System Instruction用テキストをダウンロード</button>
                    {hasChanges && <span className="text-sm text-yellow-600 animate-pulse">未保存の変更があります</span>}
                    <Button onClick={handleSave} disabled={!hasChanges}>保存</Button>
                </div>
            </header>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('roadmap')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'roadmap' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>ロードマップ</button>
                    <button onClick={() => setActiveTab('menu_groups')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'menu_groups' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>メニューグループ</button>
                    <button onClick={() => setActiveTab('tool_assignment')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'tool_assignment' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>ツール所属設定</button>
                    <button onClick={() => setActiveTab('constitution')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'constitution' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>開発憲法</button>
                    <button onClick={() => setActiveTab('guidelines_recommended')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'guidelines_recommended' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>推奨仕様</button>
                    <button onClick={() => setActiveTab('guidelines_prohibited')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'guidelines_prohibited' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>禁止事項</button>
                    <button onClick={() => setActiveTab('ai-task-gen')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'ai-task-gen' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>AIアイデア相談</button>
                </nav>
            </div>
            <div className="flex-grow overflow-y-auto">{renderContent()}</div>
            {selectedProject && <ProjectModal project={selectedProject} tasks={tasksByProjectId[selectedProject.id] || []} onClose={() => setSelectedProject(null)} onUpdate={handleRoadmapUpdate} onDelete={handleDeleteRoadmapItem} onAddTask={handleAddTask} />}
        </div>
    );
};

export default DevManagementTool;
