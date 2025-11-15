import React, { useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { getAllManufacturerTableData, getManufacturerTableData } from '@core/utils';
import { Row } from '@shared/types';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalCloseButton } from '@components/organisms/Modal';

interface TagFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    selectedManufacturer?: string;
}

const TagFilterModal: React.FC<TagFilterModalProps> = ({
    isOpen,
    onClose,
    selectedTags,
    onTagsChange,
    selectedManufacturer
}) => {
    const { database } = useDatabase();
    const [searchTerm, setSearchTerm] = useState('');

    // タグの一覧を取得（選択されたメーカーのタグ + 共通タグ）
    // 重複アクセスを防ぐため、依存配列を具体的なテーブルに限定
    // getManufacturerTableDataとgetAllManufacturerTableDataは既に読み込まれているデータベースから取得するだけなので、
    // データベース全体が更新されても再計算する必要はない
    const availableTags = useMemo(() => {
        if (!database) return [];

        const tags: Row[] = [];

        // 共通タグを取得
        const commonTagsTable = database.tags;
        if (commonTagsTable?.data && Array.isArray(commonTagsTable.data)) {
            tags.push(...commonTagsTable.data);
        }

        // 選択されたメーカーのタグを取得
        if (selectedManufacturer) {
            const manufacturerTags = getManufacturerTableData(database, 'tags', selectedManufacturer);
            tags.push(...manufacturerTags);
        } else {
            // メーカーが選択されていない場合は全メーカーのタグを取得
            // 注意: getAllManufacturerTableDataはmanufacturersテーブルから全メーカーを取得して各メーカーのタグテーブルにアクセスする
            // これは重複アクセスの原因になる可能性があるため、必要に応じて最適化が必要
            const allManufacturerTags = getAllManufacturerTableData(database, 'tags');
            tags.push(...allManufacturerTags);
        }

        // 重複除去（idで）
        const uniqueTagsMap = new Map<string, Row>();
        tags.forEach(tag => {
            const tagId = String(tag.id || '');
            if (tagId && !uniqueTagsMap.has(tagId)) {
                uniqueTagsMap.set(tagId, tag);
            }
        });

        return Array.from(uniqueTagsMap.values()).sort((a, b) => {
            const nameA = String(a.tagName || a.name || a.value || a.id || '').toLowerCase();
            const nameB = String(b.tagName || b.name || b.value || b.id || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [database?.tags, selectedManufacturer]); // database全体ではなく、database.tagsとselectedManufacturerのみに依存

    // 検索でフィルタリングされたタグ
    const filteredTags = useMemo(() => {
        if (!searchTerm.trim()) return availableTags;

        const lowerSearchTerm = searchTerm.toLowerCase();
        return availableTags.filter(tag => {
            const tagName = String(tag.tagName || tag.name || tag.value || tag.id || '').toLowerCase();
            const tagId = String(tag.id || '').toLowerCase();
            return tagName.includes(lowerSearchTerm) || tagId.includes(lowerSearchTerm);
        });
    }, [availableTags, searchTerm]);

    // タグの選択/解除
    const handleTagToggle = (tagId: string) => {
        const newSelectedTags = selectedTags.includes(tagId)
            ? selectedTags.filter(id => id !== tagId)
            : [...selectedTags, tagId];
        onTagsChange(newSelectedTags);
    };

    // すべて選択/すべて解除
    const handleSelectAll = () => {
        if (selectedTags.length === filteredTags.length) {
            onTagsChange([]);
        } else {
            onTagsChange(filteredTags.map(tag => String(tag.id)));
        }
    };

    // 選択をクリア
    const handleClear = () => {
        onTagsChange([]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="max-w-2xl max-h-[80vh]">
                <ModalHeader>
                    <ModalTitle>タグで絞り込み</ModalTitle>
                    <ModalCloseButton onClose={onClose} />
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {/* 検索バー */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="タグを検索..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"
                            />
                        </div>

                        {/* 操作ボタン */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="px-4 py-2 text-sm border rounded-md hover:bg-base-200 dark:hover:bg-base-dark-300"
                            >
                                {selectedTags.length === filteredTags.length ? 'すべて解除' : 'すべて選択'}
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-4 py-2 text-sm border rounded-md hover:bg-base-200 dark:hover:bg-base-dark-300"
                            >
                                クリア
                            </button>
                            <div className="flex-1 text-right text-sm text-gray-500 dark:text-gray-400">
                                {selectedTags.length}件選択中 / {filteredTags.length}件表示中
                            </div>
                        </div>

                        {/* タグリスト */}
                        <div className="border rounded-md max-h-96 overflow-y-auto">
                            {filteredTags.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    {searchTerm ? '検索結果がありません' : 'タグがありません'}
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {filteredTags.map(tag => {
                                        const tagId = String(tag.id || '');
                                        const tagName = String(tag.tagName || tag.name || tag.value || tag.id || '');
                                        const isSelected = selectedTags.includes(tagId);

                                        return (
                                            <label
                                                key={tagId}
                                                className={`flex items-center gap-2 p-2 rounded hover:bg-base-200 dark:hover:bg-base-dark-300 cursor-pointer ${
                                                    isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleTagToggle(tagId)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="flex-1">{tagName}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark"
                    >
                        適用
                    </button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default TagFilterModal;

