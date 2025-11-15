import { ErrorInfo } from 'react';

export interface ErrorAnalysis {
    errorType: string;
    errorCategory: string;
    componentName: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    fingerprint: string;
    normalizedMessage: string;
}

/**
 * エラーの指紋を生成（同じエラーを識別するため）
 */
function generateErrorFingerprint(message: string, stack: string): string {
    // メッセージから数値やIDを除去して正規化
    const normalizedMessage = message
        .replace(/\d+/g, 'N')
        .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
        .replace(/id:\s*[^\s,]+/gi, 'id:ID')
        .substring(0, 150)
        .trim();
    
    // スタックトレースの最初の2行を取得（ファイル名と行番号を除去）
    const stackLines = stack.split('\n').slice(1, 3);
    const normalizedStack = stackLines
        .map(line => line
            .replace(/:\d+:\d+/g, ':N:N')
            .replace(/\([^)]+\)/g, '()')
            .replace(/at\s+/g, '')
            .trim()
        )
        .join('|')
        .substring(0, 200);
    
    return `${normalizedMessage}_${normalizedStack}`;
}

/**
 * エラーを解析して分類・集計用の情報を抽出
 */
export function analyzeError(error: Error, errorInfo?: ErrorInfo): ErrorAnalysis {
    const errorName = error.name || 'UnknownError';
    const errorMessage = error.message || error.toString();
    const stackTrace = error.stack || '';
    
    // エラーの種類を判定
    let errorType = 'UNKNOWN';
    let errorCategory = 'OTHER';
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    
    // JavaScriptエラー
    if (errorName.includes('TypeError')) {
        errorType = 'TYPE_ERROR';
        errorCategory = 'JAVASCRIPT_ERROR';
        severity = errorMessage.includes('Cannot read') || errorMessage.includes('undefined') ? 'HIGH' : 'MEDIUM';
    } else if (errorName.includes('ReferenceError')) {
        errorType = 'REFERENCE_ERROR';
        errorCategory = 'JAVASCRIPT_ERROR';
        severity = 'HIGH';
    } else if (errorName.includes('SyntaxError')) {
        errorType = 'SYNTAX_ERROR';
        errorCategory = 'JAVASCRIPT_ERROR';
        severity = 'CRITICAL';
    } else if (errorName.includes('RangeError')) {
        errorType = 'RANGE_ERROR';
        errorCategory = 'JAVASCRIPT_ERROR';
        severity = 'MEDIUM';
    } else if (errorName.includes('URIError')) {
        errorType = 'URI_ERROR';
        errorCategory = 'JAVASCRIPT_ERROR';
        severity = 'LOW';
    }
    // ネットワークエラー
    else if (errorName.includes('NetworkError') || 
             errorMessage.includes('fetch') || 
             errorMessage.includes('network') ||
             errorMessage.includes('Failed to fetch')) {
        errorType = 'NETWORK_ERROR';
        errorCategory = 'NETWORK_ERROR';
        severity = 'MEDIUM';
    }
    // Reactエラー
    else if (errorMessage.includes('Maximum update depth') ||
             errorMessage.includes('Too many re-renders')) {
        errorType = 'INFINITE_LOOP';
        errorCategory = 'REACT_ERROR';
        severity = 'CRITICAL';
    } else if (errorMessage.includes('Cannot find module') ||
               errorMessage.includes('Module not found')) {
        errorType = 'MODULE_NOT_FOUND';
        errorCategory = 'BUILD_ERROR';
        severity = 'HIGH';
    }
    // その他の一般的なエラー
    else if (errorMessage.includes('Cannot read') || 
             errorMessage.includes('undefined') ||
             errorMessage.includes('null')) {
        errorType = 'NULL_REFERENCE';
        errorCategory = 'JAVASCRIPT_ERROR';
        severity = 'HIGH';
    } else if (errorMessage.includes('Permission denied') ||
               errorMessage.includes('Access denied')) {
        errorType = 'PERMISSION_ERROR';
        errorCategory = 'SECURITY_ERROR';
        severity = 'HIGH';
    }
    
    // コンポーネントスタックから発生箇所を抽出
    let componentName = 'Unknown';
    if (errorInfo?.componentStack) {
        const componentMatch = errorInfo.componentStack.match(/at\s+(\w+)/);
        if (componentMatch) {
            componentName = componentMatch[1];
        }
    } else if (stackTrace) {
        const stackMatch = stackTrace.match(/at\s+(\w+)/);
        if (stackMatch) {
            componentName = stackMatch[1];
        }
    }
    
    // エラーの指紋を生成
    const fingerprint = generateErrorFingerprint(errorMessage, stackTrace);
    
    // 正規化されたメッセージ
    const normalizedMessage = errorMessage
        .replace(/\d+/g, 'N')
        .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
        .substring(0, 200);
    
    return {
        errorType,
        errorCategory,
        componentName,
        severity,
        fingerprint,
        normalizedMessage
    };
}

