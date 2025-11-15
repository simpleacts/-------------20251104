import { Row } from './common';

// --- Language Management Tool ---
export interface LanguageSetting extends Row {
    key: string; // e.g., "customers.company_name"
    ja: string;  // e.g., "会社名"
    en: string;  // e.g., "Company Name"
}

