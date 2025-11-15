import { Row } from '../types';

// Function to escape a single field for CSV, handling commas, quotes, and newlines.
const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  // If the string contains a comma, a double quote, or a newline, wrap it in double quotes.
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Inside a double-quoted string, double quotes must be escaped by another double quote.
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function parseCSV(csvText: string, sourceName: string = 'CSV'): Row[] {
    // This is a more robust CSV parser that handles quoted fields,
    // escaped quotes (""), and newlines within fields.
    // Remove BOM (Byte Order Mark) if present
    let text = csvText;
    if (text.length > 0 && text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote ("")
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i++; // Skip the second quote
                } else {
                    inQuotes = false; // This is the closing quote
                }
            } else {
                field += char;
            }
        } else { // Not in quotes
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(field);
                field = '';
            } else if (char === '\n') {
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
    
    if (rows.length === 0 || (rows.length === 1 && rows[0].every(v => v.trim() === ''))) {
      return [];
    }

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
    
    const data: Row[] = [];

    for (let j = headerRowIndex + 1; j < rows.length; j++) {
        const values = rows[j];
        
        // Skip completely empty rows
        if (values.every(v => v.trim() === '')) {
            continue;
        }

        if (values.length !== headers.length) {
            // A common case for a blank line is a single empty string.
            // Let the main check handle it.
            if (values.length === 1 && values[0].trim() === '') {
                 // This will be caught by the hasData check below
                 continue;
            } else {
                console.warn(`[${sourceName}] Skipping malformed CSV line ${j + 1}: expected ${headers.length} fields, got ${values.length}.`);
                continue;
            }
        }
        
        const row: Row = {};
        let hasData = false;
        
        // 先頭0を保持する必要があるカラム名（コード系のカラム）
        const codeColumns = ['code', 'sizeCode', 'colorCode', 'size_code', 'color_code', 'product_code', 'productCode', 'jan_code'];
        // 日本語のコード系カラム名も文字列として扱う（先頭0を保持）
        const codeColumnPatterns = ['コード', 'code', 'Code', 'CODE'];
        
        headers.forEach((header, index) => {
            const value = values[index];
            if (value === null || value === undefined || value.trim() === '') {
                row[header] = null;
            } else {
                hasData = true; // Mark that this row contains actual data
                
                // コード系のカラムは常に文字列として扱う（先頭0を保持）
                const isCodeColumn = codeColumns.includes(header) || 
                    codeColumnPatterns.some(pattern => header.includes(pattern));
                
                if (isCodeColumn) {
                    row[header] = value; // 文字列として保持（先頭0を保持）
                } else if (value.toLowerCase() === 'true') {
                    row[header] = true;
                } else if (value.toLowerCase() === 'false') {
                    row[header] = false;
                } else if (!isNaN(Number(value)) && isFinite(Number(value))) {
                    row[header] = Number(value);
                } else {
                    row[header] = value;
                }
            }
        });
        
        // Only add the row if it contains at least one non-empty value.
        if (hasData) {
            data.push(row);
        }
    }
    return data;
}

export const convertToCSV = (data: Row[]): string => {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSVField).join(',');
  
  const dataRows = data.map(row => {
    return headers.map(header => escapeCSVField(row[header])).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

export const downloadCSV = (csvString: string, filename: string) => {
  const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * PHP側のCSVエクスポートAPIを使用してCSVをダウンロード
 * 大量データのエクスポートやサーバー側での処理が必要な場合に使用
 * 
 * @param tableName エクスポートするテーブル名
 * @param filename ダウンロードするファイル名（省略時は自動生成）
 */
export const downloadCSVFromServer = async (tableName: string, filename?: string) => {
  try {
    const url = `/api/export-csv.php?table=${encodeURIComponent(tableName)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CSV export failed: ${errorText}`);
    }

    // レスポンスからBlobを取得
    const blob = await response.blob();
    
    // ファイル名を取得（Content-Dispositionヘッダーから、または指定されたファイル名）
    let downloadFilename = filename;
    if (!downloadFilename) {
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          downloadFilename = filenameMatch[1];
        }
      }
    }
    if (!downloadFilename) {
      downloadFilename = `${tableName}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    }

    // ダウンロード
    const link = document.createElement('a');
    const url_obj = URL.createObjectURL(blob);
    link.setAttribute('href', url_obj);
    link.setAttribute('download', downloadFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url_obj);
  } catch (error) {
    console.error('[downloadCSVFromServer] Failed to export CSV:', error);
    throw error;
  }
};