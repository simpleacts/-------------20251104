import { Row } from '@shared/types';

let worker: Worker | null = null;
let messageId = 0;
const promises: Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }> = new Map();

// In a real build system, this would be a separate file.
// For this environment, we create a worker from a string blob.
const workerScript = `
// --- Dependencies from utils/csv.ts ---
function parseCSV(csvText, sourceName = 'CSV') {
    // Remove BOM (Byte Order Mark) if present
    let text = csvText.trim();
    if (text.length > 0 && text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    text = text.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
    const rows = [];
    let currentRow = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(field);
                field = '';
            } else if (char === '\\n') {
                currentRow.push(field);
                rows.push(currentRow);
                currentRow = [];
                field = '';
            } else {
                field += char;
            }
        }
        i++;
    }
    currentRow.push(field);
    rows.push(currentRow);
    
    // Remove empty rows at the end
    while (rows.length > 0 && rows[rows.length - 1].every(v => v.trim() === '')) {
        rows.pop();
    }
    
    if (rows.length < 2) return [];
    
    // Find the first non-empty row as header
    let headerRowIndex = 0;
    while (headerRowIndex < rows.length && rows[headerRowIndex].every(v => v.trim() === '')) {
        headerRowIndex++;
    }
    
    if (headerRowIndex >= rows.length) {
        return [];
    }
    
    const headers = rows[headerRowIndex].map(h => h.trim()).filter(h => h !== '');
    
    if (headers.length === 0) {
        return [];
    }
    
    const data = [];
    for (let j = headerRowIndex + 1; j < rows.length; j++) {
        const values = rows[j];
        
        // Skip completely empty rows
        if (values.every(v => v.trim() === '')) {
            continue;
        }
        
        if (values.length !== headers.length) {
            if (values.length === 1 && values[0].trim() === '') {
                continue;
            }
            console.warn(\`[\${sourceName}] Skipping malformed CSV line \${j + 1}: expected \${headers.length} fields, got \${values.length}.\`);
            continue;
        }
        const row = {};
        
        // 先頭0を保持する必要があるカラム名（コード系のカラム）
        const codeColumns = ['code', 'sizeCode', 'colorCode', 'size_code', 'color_code', 'product_code', 'productCode', 'jan_code'];
        // 日本語のコード系カラム名も文字列として扱う（先頭0を保持）
        const codeColumnPatterns = ['コード', 'code', 'Code', 'CODE'];
        
        headers.forEach((header, index) => {
            const value = values[index];
            if (value === '' || value === null || value === undefined) {
                row[header] = null;
            } else {
                // コード系のカラムかどうかを判定（完全一致またはパターンマッチ）
                const isCodeColumn = codeColumns.includes(header) || 
                    codeColumnPatterns.some(pattern => header.includes(pattern));
                
                if (isCodeColumn) {
                // コード系のカラムは常に文字列として扱う（先頭0を保持）
                    // 注意: CSVファイル自体がExcelで数値として保存されている場合（例：001が1として保存）、先頭0は復元できない
                    // そのため、CSVファイルを保存する際は、該当列を「文字列」として設定する必要がある
                row[header] = String(value);
            } else {
                const valueStr = String(value);
                if (valueStr.toLowerCase() === 'true') {
                    row[header] = true;
                } else if (valueStr.toLowerCase() === 'false') {
                    row[header] = false;
                } else if (!isNaN(Number(valueStr)) && isFinite(Number(valueStr)) && valueStr.trim() !== '') {
                    row[header] = Number(valueStr);
                } else {
                    row[header] = valueStr;
                    }
                }
            }
        });
        data.push(row);
    }
    return data;
}

// --- Original appWorker.ts logic ---
self.onmessage = (event) => {
    const { id, type, payload } = event.data;

    try {
        if (type === 'FILTER_DATA') {
            const { data, filters } = payload;
            const normalizeString = (val) => {
                if (val === null || val === undefined) return '';
                return String(val).normalize('NFKC').toLowerCase();
            };
            if (Object.keys(filters).every(key => !filters[key])) {
                const result = data; // Pass back original data with index
                self.postMessage({ id, type: 'FILTER_DATA_RESULT', payload: result });
                return;
            }
            const normalizedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
                if (value) {
                    acc[key] = normalizeString(value);
                }
                return acc;
            }, {});
            const result = data.filter((row) => {
                return Object.entries(normalizedFilters).every(([key, value]) => {
                    if (!value) return true;
                    const normalizedRowValue = normalizeString(row[key]);
                    return normalizedRowValue.includes(value);
                });
            });
            self.postMessage({ id, type: 'FILTER_DATA_RESULT', payload: result });
        } else if (type === 'PARSE_CSV') {
            const { csvText, sourceName } = payload;
            const data = parseCSV(csvText, sourceName);
            self.postMessage({ id, type: 'PARSE_CSV_RESULT', payload: data });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ id, type: 'WORKER_ERROR', error: errorMessage });
    }
};
`;

function getWorker(): Worker {
    if (!worker) {
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        
        worker = new Worker(blobUrl);

        worker.onmessage = (event: MessageEvent) => {
            const { id, type, payload, error } = event.data;
            const promise = promises.get(id);
            if (promise) {
                const { resolve, reject } = promise;
                if (type.endsWith('_RESULT')) {
                    resolve(payload);
                } else if (type === 'WORKER_ERROR') {
                    reject(new Error(error));
                }
                promises.delete(id);
            }
        };

        worker.onerror = (error) => {
            console.error('Worker error:', error);
            // Reject all pending promises
            promises.forEach(({ reject }) => reject(error));
            promises.clear();
            // Terminate and nullify the worker so it can be recreated.
            worker?.terminate();
            worker = null;
        };
    }
    return worker;
}

function postMessageToWorker(type: string, payload: any): Promise<any> {
    const id = messageId++;
    try {
        const workerInstance = getWorker();
        return new Promise((resolve, reject) => {
            promises.set(id, { resolve, reject });
            workerInstance.postMessage({ id, type, payload });
        });
    } catch (error) {
        return Promise.reject(error);
    }
}

export const filterDataInWorker = (data: Row[], filters: Record<string, string>): Promise<Row[]> => {
    return postMessageToWorker('FILTER_DATA', { data, filters });
};

export const parseCsvInWorker = (csvText: string, sourceName: string): Promise<Row[]> => {
    return postMessageToWorker('PARSE_CSV', { csvText, sourceName });
};
