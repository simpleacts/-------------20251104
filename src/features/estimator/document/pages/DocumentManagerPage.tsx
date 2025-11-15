
import { Button, MagnifyingGlassIcon, PencilIcon, SpinnerIcon, TrashIcon } from '@components/atoms';
import { PageHeader } from '@components/molecules';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { EnrichedQuote } from '@features/order-management/types';
import PrintableEstimate from '@shared/components/PrintableEstimate';
import { useTranslation } from '@shared/hooks/useTranslation';
import { CanvasState, Database } from '@shared/types';
import React, { useEffect, useMemo, useState } from 'react';
import { loadQuoteFromDatabase } from '../../utils/loadQuoteFromDatabase';
import { useDocumentData } from '../hooks/useDocumentData';
import CreateDocumentButton from '../molecules/CreateDocumentButton';
import DateFilter from '../molecules/DateFilter';
import DocumentFilter from '../molecules/DocumentFilter';
import DocumentListPanel from '../organisms/DocumentListPanel';

interface DocumentManagerProps {
    proofingCanvases: CanvasState[];
    onShowEstimator?: (documentType: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt', quoteId?: string | null) => void;
    selectedDocType?: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt';
    onDocTypeChange?: (docType: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt') => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ 
    proofingCanvases,
    onShowEstimator,
    selectedDocType,
    onDocTypeChange
}) => {
    const { t } = useTranslation('document');
    const { navigate, currentPage } = useNavigation();
    const { database, setDatabase } = useDatabase();
    const {
        isLoading, isPreviewLoading, error,
        documents, filteredDocuments, selectedQuote, setSelectedQuote,
        searchTerm, setSearchTerm, docTypeFilter, setDocTypeFilter,
        dateFilterStart, setDateFilterStart,
        dateFilterEnd, setDateFilterEnd,
        worksheetDataList, pdfRenderData, companyInfo, database: documentDatabase
    } = useDocumentData(proofingCanvases);

    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

    // 保存後に選択された見積書IDを取得して選択状態にする
    useEffect(() => {
        const savedQuoteId = sessionStorage.getItem('selectedQuoteIdAfterSave');
        if (savedQuoteId && filteredDocuments.length > 0) {
            const savedQuote = filteredDocuments.find(doc => doc.id === savedQuoteId);
            if (savedQuote) {
                setSelectedQuote(savedQuote);
                // 保存した見積書の帳票タイプに合わせてタブを切り替え
                if (onDocTypeChange && savedQuote.document_type) {
                    const rawDocType = savedQuote.document_type;
                    if (rawDocType !== 'worksheet') {
                        const docType = rawDocType as 'estimate' | 'invoice' | 'delivery_slip' | 'receipt';
                        onDocTypeChange(docType);
                    }
                }
                // 使用後は削除
                sessionStorage.removeItem('selectedQuoteIdAfterSave');
            }
        }
    }, [filteredDocuments, setSelectedQuote, onDocTypeChange]);

    const availableDocTypes = useMemo(() => {
        if (!database) return [];
        const typesFromTemplates = new Set(database.pdf_templates?.data.map(t => t.type) || []);
        const typesFromQuotes = new Set(database.quotes?.data.map(q => q.document_type) || []);
        // 指示書は除外（別管理にする）
        const allTypes = [...new Set([...typesFromTemplates, ...typesFromQuotes])].filter(Boolean).filter(type => type !== 'worksheet');
        
        const typeLabels: Record<string, string> = {
            'estimate': t('document.doc_type_estimate', '見積書'),
            'invoice': t('document.doc_type_invoice', '請求書'),
            'delivery_slip': t('document.doc_type_delivery_slip', '納品書'),
            'receipt': t('document.doc_type_receipt', '領収書')
        };

        return allTypes.map(type => ({
            id: type as string,
            label: typeLabels[type as string] || type as string
        }));
    }, [database]);

    // DocumentManagerPageではuseDocumentDataから取得したfilteredDocumentsを使用
    // このローカルのfilteredDocumentsは削除（重複しているため）

    const handleCardClick = (doc: EnrichedQuote) => {
        setSelectedQuote(doc);
        if (window.innerWidth < 768) { // md breakpoint
            setIsMobilePreviewOpen(true);
        }
    };

    const handleEdit = (doc: EnrichedQuote) => {
        // 指示書の場合は指示書メーカーへ移動
        if (doc.document_type === 'worksheet') {
            if (!doc.id) {
                alert(t('document.quote_id_not_found', '見積IDが見つかりません。'));
                return;
            }
            // sessionStorageにquoteIdを保存して指示書メーカーへ遷移
            sessionStorage.setItem('quoteToEditForWorksheet', doc.id as string);
            navigate('worksheet');
            return;
        }

        // コンテナ経由で見積作成v2を表示する場合
        if (onShowEstimator) {
            const docType = doc.document_type as 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' || 'estimate';
            onShowEstimator(docType, doc.id as string | null);
            return;
        }

        // フォールバック: 従来の方法（後方互換性）
        if (!database || !documentDatabase) {
            alert(t('document.db_not_loaded', 'データベースが読み込まれていません。'));
            return;
        }

        // 見積データからEstimatorStateを復元
        const estimatorState = loadQuoteFromDatabase(doc, documentDatabase as Database);
        if (!estimatorState) {
            alert(t('document.load_failed', '見積データの読み込みに失敗しました。'));
            return;
        }

        // ドキュメントタイプを保存
        sessionStorage.setItem('quoteToEditDocumentType', doc.document_type as string || 'estimate');
        
        // 既存のテンプレートIDを保存（編集時に作成時のテンプレートIDを保持するため）
        if (doc.last_used_template_id) {
            sessionStorage.setItem('quoteToEditTemplateId', doc.last_used_template_id as string);
        }

        // sessionStorageに保存して見積作成v2へ遷移
        sessionStorage.setItem('quoteToEdit', JSON.stringify(estimatorState));
        navigate('estimator');
    };

    // 新規作成ボタンのハンドラ
    const handleCreateNew = (type: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | 'draft') => {
        if (!onShowEstimator) {
            // フォールバック: 従来の方法
            navigate('estimator');
            return;
        }

        // 下書きの場合は特別な処理（後で実装）
        if (type === 'draft') {
            // 下書きとして新規作成（見積書タイプで下書きとして扱う）
            onShowEstimator('estimate', null);
            return;
        }

        // 指定されたタイプで新規作成
        onShowEstimator(type, null);
    };

    const handleDelete = async (doc: EnrichedQuote) => {
        if (!database || !setDatabase) {
            alert(t('document.db_not_loaded', 'データベースが読み込まれていません。'));
            return;
        }

        const quoteId = doc.id as string;
        if (!quoteId) {
            alert(t('document.quote_id_not_found', '見積IDが見つかりません。'));
            return;
        }

        // まずローカル状態から削除
        setDatabase((prevDb) => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));

            // quotesテーブルから削除
            if (newDb.quotes?.data) {
                newDb.quotes.data = newDb.quotes.data.filter((q: any) => q.id !== quoteId);
            }

            // quote_itemsテーブルから削除
            if (newDb.quote_items?.data) {
                newDb.quote_items.data = newDb.quote_items.data.filter((item: any) => item.quote_id !== quoteId);
            }

            // quote_designsテーブルから削除
            if (newDb.quote_designs?.data) {
                newDb.quote_designs.data = newDb.quote_designs.data.filter((design: any) => design.quote_id !== quoteId);
            }

            return newDb;
        });

        // サーバーから削除
        const toolName = currentPage; // Use current page as tool name
        try {
            // quote_itemsテーブルから削除
            const itemsResult = await updateDatabase(
                toolName,
                'quote_items',
                [{ type: 'DELETE' as const, where: { quote_id: quoteId } }],
                database
            );
            if (!itemsResult.success) {
                throw new Error(itemsResult.error || 'Failed to delete quote items from server');
            }

            // quote_designsテーブルから削除
            const designsResult = await updateDatabase(
                toolName,
                'quote_designs',
                [{ type: 'DELETE' as const, where: { quote_id: quoteId } }],
                database
            );
            if (!designsResult.success) {
                throw new Error(designsResult.error || 'Failed to delete quote designs from server');
            }

            // quotesテーブルから削除
            const quotesResult = await updateDatabase(
                toolName,
                'quotes',
                [{ type: 'DELETE' as const, where: { id: quoteId } }],
                database
            );
            if (!quotesResult.success) {
                throw new Error(quotesResult.error || 'Failed to delete quote from server');
            }

            console.log('[handleDelete] Successfully deleted quote from server');
        } catch (error) {
            console.error('[handleDelete] Failed to delete from server:', error);
            alert(t('document.delete_failed', 'サーバーからの削除に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            // ローカル状態は既に更新されているので、ユーザーに警告を出す
        }

        // 選択中の見積が削除された場合は選択を解除
        if (selectedQuote?.id === quoteId) {
            setSelectedQuote(null);
        }
    };
    
    const relevantCanvases = useMemo(() => {
        if (!selectedQuote) return [];
        return proofingCanvases.filter(c => c.quoteId === selectedQuote.id);
    }, [selectedQuote, proofingCanvases]);


    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <SpinnerIcon className="w-12 h-12 mx-auto text-brand-primary" />
                    <p className="mt-4 text-lg font-semibold">{t('document.loading', '帳票データを準備中...')}</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-red-600 p-4">{error}</div>;
    }

    return (
        <>
            <div className="flex flex-col h-full">
                {/* ヘッダー: 見積作成画面と同じスタイルに統一 */}
                <PageHeader
                    title={t('document.title', '帳票管理')}
                    description={t('document.description', '作成されたすべての帳票（見積書、請求書など）を管理します。')}
                >
                    {/* 新規作成ボタン */}
                    <CreateDocumentButton onSelect={handleCreateNew} />
                    
                    {/* 編集・削除ボタン（選択中の帳票がある場合のみ表示、指示書以外のすべての帳票タイプで表示） */}
                    {selectedQuote && selectedQuote.document_type !== 'worksheet' && (
                        <>
                            <Button
                                onClick={() => handleEdit(selectedQuote)}
                                variant="secondary"
                                size="md"
                                className="flex items-center gap-2"
                            >
                                <PencilIcon className="w-4 h-4" />
                                編集
                            </Button>
                            <Button
                                onClick={() => handleDelete(selectedQuote)}
                                variant="danger"
                                size="md"
                                className="flex items-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" />
                                削除
                            </Button>
                        </>
                    )}
                </PageHeader>

                <div className="flex-grow flex flex-col min-h-0">
                    <div className="flex-shrink-0 bg-base-100 dark:bg-base-dark-200 p-3 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center gap-2 mb-4">
                        {/* タブフィルター */}
                        <DocumentFilter
                            docTypeFilter={docTypeFilter}
                            onDocTypeFilterChange={setDocTypeFilter}
                            availableTypes={availableDocTypes}
                        />
                        
                        {/* 検索バーと日付フィルター */}
                        <div className="flex items-center gap-2 flex-grow">
                            <DateFilter
                                dateStart={dateFilterStart}
                                dateEnd={dateFilterEnd}
                                onDateStartChange={setDateFilterStart}
                                onDateEndChange={setDateFilterEnd}
                                docType={docTypeFilter !== 'all' ? docTypeFilter as 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' : 'all'}
                            />
                            <div className="relative w-full md:w-auto flex-grow">
                                <label htmlFor="document-search-input" className="sr-only">{t('document.search_label', '案件コード, 顧客名で検索')}</label>
                                <input
                                    id="document-search-input"
                                    name="document-search-input"
                                    type="text"
                                    placeholder={t('document.search_placeholder', '案件コード, 顧客名...')}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 p-2 w-full border rounded-md bg-base-200 dark:bg-base-dark-300"
                                />
                                <MagnifyingGlassIcon className="w-5 h-5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-grow min-h-0">
                        <DocumentListPanel
                            documents={filteredDocuments}
                            selectedQuote={selectedQuote}
                            onCardClick={handleCardClick}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                        <div className="hidden md:flex md:col-span-7 lg:col-span-8 rounded-lg shadow-inner overflow-hidden relative">
                            {pdfRenderData && (
                                <PrintableEstimate {...pdfRenderData} isEmbedded={true} onClose={() => {}} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isMobilePreviewOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-2 md:hidden" onClick={() => setIsMobilePreviewOpen(false)}>
                     <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
                        {pdfRenderData && <PrintableEstimate {...pdfRenderData} isEmbedded={true} onClose={() => setIsMobilePreviewOpen(false)} />}
                    </div>
                </div>
            )}
        </>
    );
};

export default DocumentManager;

