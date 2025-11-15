// Image File Converter
export type RuleType = 'replace' | 'prefix' | 'suffix' | 'case';

export interface Rule {
  id: string;
  type: RuleType;
  enabled: boolean;
  params: {
    search?: string;
    replace?: string;
    useRegex?: boolean;
    caseSensitive?: boolean;
    text?: string;
    caseType?: 'lower' | 'upper' | 'title';
  };
}

export interface FilePreview {
  originalName: string;
  newName: string;
  path: string;
  file: File;
  selected: boolean;
}

