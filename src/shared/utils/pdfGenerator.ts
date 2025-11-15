/**
 * mPDFを使用したPDF生成ユーティリティ
 */

export interface PdfGenerationData {
    type: 'quote' | 'invoice' | 'delivery_slip' | 'receipt' | 'worksheet' | 'pricing_schedule';
    data: any;
    filename?: string;
}

/**
 * mPDFを使用してPDFを生成し、ダウンロードする
 */
export async function generateAndDownloadPDF(
    generationData: PdfGenerationData,
    filename?: string
): Promise<void> {
    try {
        const response = await fetch('/api/generate-pdf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(generationData),
        });

        // Content-Typeをチェックしてエラーかどうかを判定
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // JSONレスポンスの場合はエラー
            const errorData = await response.json();
            throw new Error(errorData.error || 'PDF生成に失敗しました');
        }

        if (!response.ok) {
            throw new Error(`PDF生成に失敗しました (HTTP ${response.status})`);
        }

        const blob = await response.blob();
        
        // blobが空でないかチェック
        if (blob.size === 0) {
            throw new Error('PDFファイルが空です');
        }
        
        const url = window.URL.createObjectURL(blob);
        
        const downloadFilename = filename || generationData.filename || 'document.pdf';
        
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to generate PDF:', error);
        throw error;
    }
}

/**
 * mPDFを使用してPDFを生成し、新しいウィンドウで開く（印刷用）
 */
export async function generateAndOpenPDFForPrint(
    generationData: PdfGenerationData
): Promise<void> {
    try {
        const response = await fetch('/api/generate-pdf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(generationData),
        });

        // Content-Typeをチェック
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'PDF生成に失敗しました');
        }

        if (!response.ok) {
            throw new Error(`PDF生成に失敗しました (HTTP ${response.status})`);
        }

        const blob = await response.blob();
        
        // blobが空でないかチェック
        if (blob.size === 0) {
            throw new Error('PDFファイルが空です');
        }
        
        const url = window.URL.createObjectURL(blob);
        
        // 新しいウィンドウでPDFを開く（ブラウザの印刷ダイアログが表示される）
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            // ポップアップブロックされた場合、ダウンロードにフォールバック
            const link = document.createElement('a');
            link.href = url;
            link.download = generationData.filename || 'document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // 少し遅延してからURLを解放（ウィンドウが開くまで待つ）
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 1000);
    } catch (error) {
        console.error('Failed to generate PDF for print:', error);
        throw error;
    }
}

