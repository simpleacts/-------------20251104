import React, { useState, useCallback } from 'react';
import { Page } from '@core/config/Routes';
import { CanvasState } from '@shared/types';
import { useBrowserHistory } from '@shared/hooks/useBrowserHistory';
import DocumentManager from '../document/pages/DocumentManagerPage';
import EstimatorPageV2 from './EstimatorPageV2';

interface EstimatorPageV2ContainerProps {
    onNavigate: (page: Page, table?: string) => void;
    proofingCanvases?: CanvasState[];
}

type ViewMode = 'document-list' | 'estimator';

const EstimatorPageV2Container: React.FC<EstimatorPageV2ContainerProps> = ({ 
    onNavigate,
    proofingCanvases = []
}) => {
    // 現在の表示モードを管理
    const [currentView, setCurrentView] = useState<ViewMode>('document-list');
    
    // 編集中の帳票タイプを管理
    const [editingDocumentType, setEditingDocumentType] = useState<'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | null>(null);
    
    // 編集中の見積IDを管理（編集時のみ）
    const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
    
    // 選択中の帳票タイプ（タブ）を管理
    const [selectedDocType, setSelectedDocType] = useState<'estimate' | 'invoice' | 'delivery_slip' | 'receipt'>('estimate');

    // ブラウザの戻る・進むボタンに対応
    const handleStateChange = useCallback((state: { view: ViewMode; documentType: string | null; quoteId: string | null } | null) => {
        if (state) {
            setCurrentView(state.view);
            setEditingDocumentType(state.documentType as any);
            setEditingQuoteId(state.quoteId);
            if (state.documentType) {
                setSelectedDocType(state.documentType as any);
            }
        } else {
            // 履歴がない場合は帳票一覧に戻る
            setCurrentView('document-list');
            setEditingDocumentType(null);
            setEditingQuoteId(null);
        }
    }, []);

    // 履歴管理
    useBrowserHistory(
        {
            view: currentView,
            documentType: editingDocumentType,
            quoteId: editingQuoteId
        },
        handleStateChange
    );

    // 見積作成v2画面に戻る関数（保存した見積書のIDを渡す）
    const handleBackToDocumentList = (savedQuoteId?: string) => {
        setCurrentView('document-list');
        setEditingDocumentType(null);
        setEditingQuoteId(null);
        // 保存した見積書のIDを保存（DocumentManagerで使用）
        if (savedQuoteId) {
            sessionStorage.setItem('selectedQuoteIdAfterSave', savedQuoteId);
        }
    };

    // 見積作成v2画面を表示する関数
    const handleShowEstimator = (
        documentType: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt',
        quoteId?: string | null
    ) => {
        setEditingDocumentType(documentType);
        setEditingQuoteId(quoteId || null);
        setSelectedDocType(documentType);
        setCurrentView('estimator');
    };

    // 見積作成v2画面を表示するかどうか
    if (currentView === 'estimator') {
        // 新規作成モードかどうか（quoteIdがnullの場合）
        const isNewDocument = editingQuoteId === null;
        
        return (
            <EstimatorPageV2 
                onNavigate={onNavigate}
                onBackToDocumentList={handleBackToDocumentList}
                initialDocumentType={editingDocumentType}
                initialQuoteId={editingQuoteId}
                selectedDocType={selectedDocType}
                isNewDocument={isNewDocument}
            />
        );
    }

    // デフォルトは帳票管理画面を表示
    return (
        <DocumentManager 
            proofingCanvases={proofingCanvases}
            onShowEstimator={handleShowEstimator}
            selectedDocType={selectedDocType}
            onDocTypeChange={setSelectedDocType}
        />
    );
};

export default EstimatorPageV2Container;

