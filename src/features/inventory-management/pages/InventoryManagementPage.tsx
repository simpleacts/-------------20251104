import React from 'react';
import InventorySearchPage from './inventory-management/SearchPage';

const InventoryManagementPage: React.FC = () => {
    // 既存の在庫管理ページは新しい検索ページ構成に置き換え済みのため
    // ここでは検索フォームを表示するだけにする
    return (
        <InventorySearchPage />
    );
};

export default InventoryManagementPage;

