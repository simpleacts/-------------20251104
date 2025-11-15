import { SpinnerIcon } from '@components/atoms';
import { useAuth } from '@core/contexts/AuthContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import InventoryManagementTool from '@features/inventory-management/pages/InventoryManagementPage';
import { CanvasState, Database, ToolDependency } from '@shared/types';
import transformDatabaseToAppData from '@shared/utils/estimatorDataTransformer';
import React, { lazy, Suspense, useMemo } from 'react';
import { getLanguageTablesForPage } from './getLanguageTablesForPage';

// FIX: Moved Page type and ALL_TOOLS constant here from Sidebar.tsx to resolve circular dependency.
export type Page =
    | 'hub' | 'estimator' | 'proofing' | 'worksheet' | 'data-io'
    | 'image-converter' | 'image-batch-linker' | 'tool-guide' | 'print-history'
    | 'ink-mixing'
    | 'ink-series-management'
    | 'ink-product-management'
    | 'color-library-manager' | 'pricing-manager' | 'permission-manager' | 'id-manager'
    | 'dtf-cost-calculator' | 'pdf-template-manager' | 'pdf-item-group-manager'
    | 'pdf-preview-settings'
    | 'pricing-assistant' | 'system-logs' | 'dev-tools' | 'user-manager' | 'dev-lock-manager'
    | 'backup-manager' | 'tool-porting-manager'
    | 'customer-management' | 'dev-management'
    | 'tool-dependency-manager'
    | 'calculation-logic-manager' | 'task-settings'
    | 'order-management' | 'production-scheduler' | 'product-definition-tool' | 'product-definition-manufacturer-tool'
    | 'production-settings' | 'email-tool'
    | 'ai-task-management' | 'google-api-settings'
    | 'accounts-receivable' | 'accounts-payable' | 'cash-flow-analysis' | 'task-analysis'
    | 'work-record'
    | 'tool-dependency-scanner' | 'unregistered-module-tool' | 'development-workflow'
    | 'silkscreen-logic-tool' | 'dtf-logic-tool' | 'shipping-logic-tool' | 'language-manager' | 'email-settings' | 'architecture-designer'
    | 'php-info-viewer' | 'module-list' | 'estimator-settings' | 'display-settings' | 'system-diagnostics'
    | 'inventory-management' | 'database-schema-manager' | 'product-management';

export const ALL_TOOLS: { name: Page; displayName: string }[] = [
    { name: 'hub', displayName: 'ダッシュボード' },
    { name: 'order-management', displayName: '業務管理' },
    { name: 'ai-task-management', displayName: 'AIタスク管理' },
    { name: 'production-scheduler', displayName: '生産スケジューリング' },
    { name: 'customer-management', displayName: '取引先管理' },
    { name: 'email-tool', displayName: 'メール管理' },
    { name: 'estimator', displayName: '見積作成' },
    { name: 'proofing', displayName: '仕上がりイメージ作成' },
    { name: 'worksheet', displayName: '指示書メーカー' },
    { name: 'accounts-receivable', displayName: '売掛管理' },
    { name: 'accounts-payable', displayName: '買掛管理' },
    { name: 'work-record', displayName: '作業記録' },
    { name: 'cash-flow-analysis', displayName: '資金繰り分析' },
    { name: 'task-analysis', displayName: 'タスク分析' },
    { name: 'product-definition-tool', displayName: '商品定義管理' },
    { name: 'product-definition-manufacturer-tool', displayName: '商品定義管理（メーカー依存）' },
    { name: 'product-management', displayName: '商品データ管理' },
    { name: 'inventory-management', displayName: '商品在庫管理' },
    { name: 'pricing-manager', displayName: 'プリント単価表管理' },
    { name: 'pricing-assistant', displayName: '価格設定アシスタント' },
    { name: 'production-settings', displayName: '生産設定ツール' },
    { name: 'task-settings', displayName: 'タスク設定' },
    { name: 'print-history', displayName: '印刷履歴登録' },
    { name: 'ink-mixing', displayName: 'インク配合管理' },
    { name: 'ink-series-management', displayName: 'インクシリーズ管理' },
    { name: 'ink-product-management', displayName: 'インク製品管理' },
    { name: 'color-library-manager', displayName: 'カラーライブラリ管理' },
    { name: 'dtf-cost-calculator', displayName: 'DTF計算ロジック管理' },
    { name: 'data-io', displayName: 'データ入出力' },
    { name: 'image-converter', displayName: 'ファイル名変換' },
    { name: 'image-batch-linker', displayName: '商品画像一括紐付け' },
    { name: 'pdf-template-manager', displayName: 'PDFテンプレート管理' },
    { name: 'pdf-item-group-manager', displayName: 'PDF明細項目管理' },
    { name: 'user-manager', displayName: 'ユーザー管理' },
    { name: 'permission-manager', displayName: '権限管理' },
    { name: 'id-manager', displayName: 'ID形式管理' },
    { name: 'google-api-settings', displayName: 'Google連携設定' },
    { name: 'display-settings', displayName: '表示設定' },
    { name: 'email-settings', displayName: 'メール設定' },
    { name: 'estimator-settings', displayName: '見積作成設定' },
    { name: 'pdf-preview-settings', displayName: 'PDFプレビュー設定' },
    { name: 'backup-manager', displayName: '自動バックアップ設定' },
    { name: 'system-logs', displayName: 'システムログ' },
    { name: 'dev-management', displayName: '開発管理ツール' },
    { name: 'dev-tools', displayName: '開発者向けツール' },
    { name: 'dev-lock-manager', displayName: '開発ロック管理' },
    { name: 'tool-porting-manager', displayName: 'ツール移植管理' },
    { name: 'tool-guide', displayName: '使い方ガイド' },
    { name: 'tool-dependency-manager', displayName: 'ツール依存性管理' },
    { name: 'calculation-logic-manager', displayName: '計算ロジック管理' },
    { name: 'tool-dependency-scanner', displayName: '依存関係スキャン' },
    { name: 'unregistered-module-tool', displayName: 'モジュールカタログ管理' },
    { name: 'architecture-designer', displayName: 'アーキテクチャ設計' },
    { name: 'php-info-viewer', displayName: 'PHP情報ビューア' },
    { name: 'system-diagnostics', displayName: 'システム診断' },
    { name: 'language-manager', displayName: '言語設定管理' },
    { name: 'database-schema-manager', displayName: 'データベーススキーマ管理' },
];


const ProofingTool = lazy(() => import('../../features/proofing-tool/pages/ProofingPage'));
const WorksheetGenerator = lazy(() => import('../../features/work-sheet/pages/WorksheetGeneratorPage'));
const OrderManagementTool = lazy(() => import('../../features/order-management/pages/OrderManagementPage'));
const DataIO = lazy(() => import('../../features/data-io/pages/DataIOPage'));
const EstimatorPageV2Container = lazy(() => import('../../features/estimator/pages/EstimatorPageV2Container'));
const ImageFileNameConverter = lazy(() => import('../../features/image-file-name-converter/pages/ImageFileNameConverterPage'));
const ImageBatchLinker = lazy(() => import('../../features/image-batch-linker/pages/ImageBatchLinkerPage'));
const ToolGuide = lazy(() => import('../../features/tool-guide/pages/ToolGuidePage'));
const PrintHistoryTool = lazy(() => import('../../features/print-history/pages/PrintHistoryPage'));
const InkMixingTool = lazy(() => import('../../features/ink-mixing/mixing/pages/InkMixingPage'));
const InkSeriesManager = lazy(() => import('../../features/ink-mixing/management/pages/InkSeriesManagerPage'));
const InkProductManager = lazy(() => import('../../features/ink-mixing/management/pages/InkProductManagerPage'));
const ColorLibraryManager = lazy(() => import('../../features/ink-mixing/management/pages/ColorLibraryManagerPage'));
const PricingManager = lazy(() => import('../../features/pricing-management/pages/PricingManagerPage'));
const PermissionManager = lazy(() => import('../../features/user-management/pages/PermissionManagerPage'));
const IdManager = lazy(() => import('../../features/id-manager/pages/IdManagerPage'));
const PdfTemplateManager = lazy(() => import('../../features/pdf-template-manager/pages/PdfTemplateManagerPage'));
const PdfItemGroupManager = lazy(() => import('../../features/pdf-item-group-manager/templates/PdfItemGroupManager'));
const PdfPreviewSettingsTool = lazy(() => import('../../features/pdf-preview-settings/pages/PdfPreviewSettingsPage'));
const PricingAssistant = lazy(() => import('../../features/pricing-management/pages/PricingAssistantPage'));
const LogViewer = lazy(() => import('../../features/system-logs/pages/LogViewerPage'));
const DevTools = lazy(() => import('../../features/dev-tools/pages/DevToolsPage'));
const UserManager = lazy(() => import('../../features/user-management/pages/UserManagerPage'));
const DevLockManager = lazy(() => import('../../features/dev-tools/pages/DevLockManagerPage'));
const BackupManager = lazy(() => import('../../features/backup-manager/pages/BackupManagerPage'));
const CustomerManagementTool = lazy(() => import('../../features/customermanagement/pages/CustomerManagementPage'));
const DevManagementTool = lazy(() => import('../../features/dev-tools/pages/DevManagementPage'));
const TaskSettingsTool = lazy(() => import('../../features/task-settings/pages/TaskSettingsPage'));
const ProductionScheduler = lazy(() => import('../../features/production-scheduler/pages/ProductionSchedulerPage'));
const ProductDefinitionTool = lazy(() => import('../../features/product-definition/pages/ProductDefinitionPage'));
const ProductDefinitionManufacturerTool = lazy(() => import('../../features/product-definition/pages/ProductDefinitionManufacturerPage'));
const ProductManagementTool = lazy(() => import('../../features/product-management/pages/ProductManagementPage'));
const ProductionSettingsTool = lazy(() => import('../../features/production-settings/pages/ProductionSettingsPage'));
const EmailManagementTool = lazy(() => import('../../features/email-management/pages/EmailManagementPage'));
const AITaskManager = lazy(() => import('../../features/aitaskmanagement/pages/AITaskManagerPage'));
const GoogleApiSettingsTool = lazy(() => import('../../features/google-api-settings/pages/GoogleApiSettingsPage'));
const EmailSettingsTool = lazy(() => import('../../features/email-management/pages/EmailSettingsPage'));
const ToolDependencyManager = lazy(() => import('../../features/tool-dependency-manager/pages/ToolDependencyManagerPage'));
const AccountsReceivableTool = lazy(() => import('../../features/accounting/pages/AccountsReceivablePage'));
const AccountsPayableTool = lazy(() => import('../../features/accounting/pages/AccountsPayablePage'));
const CashFlowTool = lazy(() => import('../../features/accounting/pages/CashFlowPage'));
const TaskAnalysisTool = lazy(() => import('../../features/task-analysis/pages/TaskAnalysisPage'));
const WorkRecordTool = lazy(() => import('../../features/work-record/pages/WorkRecordPage'));
const HubPage = lazy(() => import('../../features/hub/pages/HubPage'));
const ToolDependencyScanner = lazy(() => import('../../features/tool-dependency-scanner/pages/ToolDependencyScannerPage'));
const ModuleCatalogTool = lazy(() => import('../../features/module-catalog/pages/ModuleCatalogPage'));
const SilkscreenLogicTool = lazy(() => import('../../features/silkscreen/pages/SilkscreenLogicPage'));
const DtfLogicTool = lazy(() => import('../../features/dtf/pages/DtfLogicPage'));
const ShippingLogicTool = lazy(() => import('../../features/pricing-management/pages/ShippingLogicToolPage'));
const LanguageManager = lazy(() => import('../../features/language-manager/pages/LanguageManagerPage'));
const ArchitectureDesigner = lazy(() => import('../../features/architecture/pages/ArchitectureDesignerPage'));
const CalculationLogicManager = lazy(() => import('../../features/estimator/CalculationLogicManager'));
const EstimatorSettingsTool = lazy(() => import('../../features/estimator-settings/pages/EstimatorSettingsPage'));
const DisplaySettingsTool = lazy(() => import('../../features/display-settings/pages/DisplaySettingsPage'));
const PhpInfoViewer = lazy(() => import('../../features/php-info-viewer/pages/PhpInfoViewerPage'));
const SystemDiagnosticsTool = lazy(() => import('../../features/system-diagnostics/pages/SystemDiagnosticsPage'));


import { AppMode } from '../types/appMode';

interface RoutesProps {
    proofingCanvases: CanvasState[];
    setProofingCanvases: React.Dispatch<React.SetStateAction<CanvasState[]>>;
    getPaginationConfigFor: (target: string) => { enabled: boolean; itemsPerPage: number; };
    isGapiReady: boolean;
    appMode: AppMode;
    setAppMode: (mode: AppMode) => void;
    handleLiveUpdate: (newSettings: Record<string, any>) => void;
    handleClearLiveUpdate: () => void;
}

/**
 * tool_dependenciesテーブルから指定されたページの依存関係を取得する
 * @param page ページ名
 * @param database データベースオブジェクト（オプション）
 * @param includeOnDemand on_demandのテーブルも含めるか（デフォルト: false）
 * @returns テーブル名の配列
 */
const getRequiredTablesFromDependencies = (
    page: Page,
    database?: Partial<Database> | null,
    includeOnDemand: boolean = false
): string[] => {
    if (!database?.tool_dependencies?.data) {
        return [];
    }

    const dependencies = database.tool_dependencies.data as ToolDependency[];
    // on_tool_mount: ツールがマウントされた時に読み込む（マスタデータ、設定データなど）
    // on_demand: 必要な時に読み込む（登録データなど、モーダルが開いた時など）
    // on_app_startは除外（アプリ起動時に読み込まれるため、ここでは不要）
    // colors, sizesはstockテーブルから取得されるため、除外
    return dependencies
        .filter(d => {
            if (d.tool_name !== page) return false;
            // colors, sizesはstockテーブルから取得されるため、除外
            if (d.table_name === 'colors' || d.table_name === 'sizes' || 
                d.table_name.startsWith('colors_') || d.table_name.startsWith('sizes_')) {
                return false;
            }
            if (d.load_strategy === 'on_tool_mount') return true;
            if (includeOnDemand && d.load_strategy === 'on_demand') return true;
            return false;
        })
        .map(d => d.table_name);
};

/**
 * ページに必要なテーブルのリストを取得する（ハイブリッドアプローチ）
 * 1. tool_dependenciesテーブルから取得を試みる（on_tool_mountのみ）
 * 2. 取得できない場合は既存の手動定義を使用
 * 
 * 注意: on_demandのテーブルは含まれません。
 * on_demandのテーブルは、各コンポーネント（モーダルなど）で個別に読み込んでください。
 * 
 * @param page ページ名
 * @param selectedTable 選択されたテーブル（オプション）
 * @param database データベースオブジェクト（オプション）
 * @returns 必要なテーブル名の配列（on_tool_mountのみ）
 */
export const getRequiredTablesForPage = (
    page: Page, 
    selectedTable?: string,
    database?: Partial<Database> | null
): string[] => {
    // Phase 1: tool_dependenciesから取得を試みる（on_tool_mountのみ）
    const tablesFromDeps = getRequiredTablesFromDependencies(page, database, false);
    if (tablesFromDeps.length > 0) {
        return tablesFromDeps;
    }

    // Phase 2: フォールバック - 既存の手動定義を使用
    return getRequiredTablesForPageManual(page, selectedTable);
};

/**
 * on_demandのテーブルを取得する（モーダルが開いた時など、必要な時に使用）
 * @param page ページ名
 * @param database データベースオブジェクト（オプション）
 * @returns on_demandのテーブル名の配列
 */
export const getOnDemandTablesForPage = (
    page: Page,
    database?: Partial<Database> | null
): string[] => {
    if (!database?.tool_dependencies?.data) {
        return [];
    }

    const dependencies = database.tool_dependencies.data as ToolDependency[];
    return dependencies
        .filter(d => 
            d.tool_name === page && 
            d.load_strategy === 'on_demand'
        )
        .map(d => d.table_name);
};

/**
 * 見積作成ツールの必須テーブル（増えないが、見積作成に絶対に必要なもの）
 * これらは最初に読み込む
 */
export const getEstimatorEssentialTables = (): string[] => {
    return [
        // 基本設定
        'settings', 'color_settings', 'layout_settings', 'behavior_settings',
        // マスタデータ（増えない）
        // 注意: colors, sizesは削除済み（stockテーブルから取得）
        'stock', // 商品データ（メーカー依存テーブル）
        'brands', // ブランドデータ（共通テーブルtemplates/common/brands.csv）
        'customer_groups', 'tags', 'categories', 'manufacturers', 'payment_methods', 'free_input_item_types',
        // 価格・コスト設定（増えない）
        'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size',
        'additional_print_costs_by_location', 'additional_print_costs_by_tag',
        'print_pricing_tiers', 'shipping_costs',
        // 組み合わせ・制約（増えない）
        'print_cost_combination', 'plate_cost_combination',
        'category_print_locations', 'print_size_constraints', 'print_locations',
        // 会社情報・その他（増えない）
        'company_info', 'partner_codes', 'prefectures',
        // 価格ルール（増えない）
        'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
        // 追加オプション（増えない）
        'additional_options',
        // DTF関連（増えない）
        'dtf_consumables', 'dtf_equipment', 'dtf_labor_costs',
        'dtf_electricity_rates', 'dtf_printers', 'dtf_print_speeds', 'dtf_press_time_costs',
        // PDF関連（増えない）
        'pdf_templates', 'pdf_item_display_configs'
    ];
};

/**
 * 見積作成ツールの遅延読み込みテーブル（今後増える可能性があるもの）
 * 必須テーブル読み込み後に読み込む
 */
export const getEstimatorLazyTables = (): string[] => {
    return [
        // 商品データはstockテーブルから取得されるため、削除
        // 注意: products_master, product_details, product_tagsは削除済み（stockテーブルから取得）
        // 注意: product_pricesとproduct_colorsは非推奨（stockテーブルから取得）
        // 注意: skusは不要（SKU情報はstockテーブルに含まれている）
        // 注意: brandsはgetEstimatorEssentialTables()に移動（必須テーブルとして扱う）
        // 顧客データ（今後増える）
        'customers'
    ];
};

/**
 * 既存の手動定義によるテーブル取得（フォールバック用）
 */
export const getRequiredTablesForPageManual = (page: Page, selectedTable?: string): string[] => {
    // ツール固有の言語設定テーブルを取得
    const toolLanguageTables = getLanguageTablesForPage(page);
    
    switch(page) {
        case 'order-management': return ['quotes', 'customers', 'quote_items', 'quote_tasks', 'task_master', 'quote_designs', 'quote_history', 'quote_status_master', 'payment_status_master', 'payment_methods', 'production_status_master', 'shipping_status_master', 'data_confirmation_status_master', 'shipping_carriers', 'google_api_settings', 'pagination_settings', ...toolLanguageTables];
        case 'estimator': 
        case 'proofing': return ['quotes', 'customers', 'stock', 'brands', 'quote_items', 'google_api_settings', 'size_order_master', ...toolLanguageTables];
        case 'worksheet': return ['quotes', 'customers', 'quote_items', 'stock', 'brands', 'company_info', ...toolLanguageTables];
        case 'production-scheduler': return ['quotes', 'quote_tasks', 'task_master', 'customers', 'quote_items', 'settings', ...toolLanguageTables];
        case 'customer-management': return ['customers', 'quotes', 'customer_groups', 'pagination_settings', 'prefectures'];
        case 'email-tool': return ['emails', 'email_attachments', 'quotes', 'customers', 'email_accounts', 'task_master'];
        case 'ai-task-management': return ['quote_tasks', 'quotes', 'customers', 'emails', 'task_master', 'email_accounts', 'email_attachments', 'work_sessions', 'work_session_quotes', 'users'];
        case 'accounts-receivable':
        case 'accounts-payable':
        case 'cash-flow-analysis': return ['quotes', 'customers', 'bills', 'bill_items', 'customer_groups'];
        case 'task-analysis': return ['quote_tasks', 'task_master'];
        case 'work-record': return ['work_sessions', 'work_session_quotes', 'quotes', 'task_master', 'users'];
        case 'inventory-management': return ['stock', 'brands', 'stock_history', 'pagination_settings', ...toolLanguageTables];
        // 注意: skus, colors, sizes, incoming_stockは非推奨（stockテーブルから取得）
        case 'product-management': return ['manufacturers', 'brands', ...toolLanguageTables];
        // 注意: product_detailsはメーカー依存テーブル（manu_xxxx_details形式）として動的に読み込まれる
        case 'product-definition-tool': return ['manufacturers', 'brands', 'categories', 'tags', 'print_locations', 'print_size_constraints', 'category_print_locations', 'print_cost_combination', 'plate_cost_combination', 'payment_methods', 'time_units', 'calculation_logic_types', 'ink_product_types', 'weight_volume_units', 'free_input_item_types', 'color_libraries', 'color_library_types', 'size_order_master'];
        case 'product-definition-manufacturer-tool': return ['manufacturers', 'stock'];
        // 注意: colors, sizesは削除済み（stockテーブルから取得）
        case 'pricing-manager': return ['print_pricing_schedules', 'print_pricing_tiers', 'users', 'roles'];
        case 'pricing-assistant': return ['pricing_rules', 'pricing_assignments', 'category_pricing_schedules', 'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size', 'additional_print_costs_by_location', 'additional_print_costs_by_tag', 'shipping_costs', 'customer_groups', 'manufacturers', 'categories', 'print_pricing_schedules'];
        case 'permission-manager': return ['roles', 'role_permissions'];
        case 'id-manager': return ['id_formats'];
        case 'language-manager': return [
            'language_settings_common',
            'language_settings_customer_management',
            'language_settings_order_management',
            'language_settings_product_management',
            'language_settings_user_manager',
            'language_settings_language_manager',
            'language_settings', // 後方互換性
            'languages',
            'pagination_settings'
        ];
        case 'dtf-cost-calculator':
                return [...getRequiredTablesForPageManual('estimator'), ...toolLanguageTables];
        case 'estimator-settings': return ['settings', ...toolLanguageTables];
        case 'ink-mixing': return ['ink_recipes', 'ink_recipe_components', 'ink_products', 'ink_series', 'ink_manufacturers', 'pantone_colors', 'dic_colors', 'quotes', 'customers', 'ink_recipe_usage', ...toolLanguageTables];
        case 'ink-series-management': return ['ink_series', 'ink_manufacturers', ...toolLanguageTables];
        case 'ink-product-management': return ['ink_products', 'ink_series', 'ink_manufacturers', 'ink_product_types', 'weight_volume_units', 'pagination_settings', ...toolLanguageTables];
        case 'color-library-manager': return ['pantone_colors', 'dic_colors', 'color_libraries', 'color_library_types', 'pagination_settings', ...toolLanguageTables];
        case 'data-io': return ['brands', 'filename_rule_presets', 'sql_export_presets', 'invoice_parsing_templates', ...toolLanguageTables];
        case 'image-batch-linker': return ['stock', ...toolLanguageTables];
        // 注意: products_master, product_detailsは削除済み（stockテーブルから取得）
        case 'pdf-template-manager': return ['pdf_templates', 'pdf_item_display_configs', ...toolLanguageTables];
        case 'pdf-item-group-manager': return ['pdf_item_display_configs', ...toolLanguageTables];
        case 'pdf-preview-settings': return ['pdf_preview_zoom_configs', 'pagination_settings', ...toolLanguageTables];
        case 'print-history': return ['print_history', 'print_history_images', 'print_history_positions', 'print_location_metrics', ...toolLanguageTables];
        case 'user-manager': return ['users', 'roles', ...toolLanguageTables];
        case 'task-settings': return ['task_master', 'task_generation_rules', 'task_time_settings', 'time_units', 'calculation_logic_types', ...toolLanguageTables];
        case 'google-api-settings': return ['google_api_settings', 'email_accounts', 'ai_settings', 'gemini_models', ...toolLanguageTables];
        case 'email-settings': return ['settings', 'email_settings', 'email_general_settings', 'ai_settings', 'email_accounts', 'email_templates', 'languages', 'email_labels', 'email_label_ai_rules', ...toolLanguageTables];
        case 'tool-dependency-manager': return ['tool_dependencies', ...toolLanguageTables];
        case 'tool-dependency-scanner': return ['app_logs', 'tool_dependencies', ...toolLanguageTables];
        case 'display-settings': return ['color_settings', 'layout_settings', 'behavior_settings', 'tool_visibility_settings', 'pagination_settings', 'google_fonts', 'icons', ...toolLanguageTables];
        case 'silkscreen-logic-tool': 
        case 'dtf-logic-tool': 
        case 'shipping-logic-tool': 
        case 'calculation-logic-manager': return [...getRequiredTablesForPageManual('estimator'), ...toolLanguageTables];
        case 'dev-management': return ['dev_roadmap', 'dev_constitution', 'dev_guidelines_recommended', 'dev_guidelines_prohibited', 'modules_core', ...toolLanguageTables];
        case 'module-list': return [...toolLanguageTables];
        case 'unregistered-module-tool': return ['modules_core', 'modules_page_tool', 'modules_service', 'modules_other', 'modules_ui_atoms', 'modules_ui_molecules', 'modules_ui_organisms', 'modules_ui_modals', ...toolLanguageTables];
        case 'development-workflow': return [...toolLanguageTables];
        case 'architecture-designer': return [...toolLanguageTables];
        case 'php-info-viewer': return [...toolLanguageTables];
        case 'system-diagnostics': return ['settings', ...toolLanguageTables];
        case 'database-schema-manager': return ['settings', 'tool_dependencies', 'tool_migrations', 'app_logs', ...toolLanguageTables];
        case 'hub': return [...toolLanguageTables];
        default: return [...toolLanguageTables];
    }
}

export const Routes: React.FC<RoutesProps & { database: Partial<Database>; setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>> }> = ({
    proofingCanvases,
    setProofingCanvases,
    getPaginationConfigFor,
    isGapiReady,
    appMode,
    setAppMode,
    handleLiveUpdate,
    handleClearLiveUpdate,
    database,
    setDatabase,
}) => {
    const { currentPage, selectedTable, navigate } = useNavigation();
    const { currentUser } = useAuth();
    
    const appData = useMemo(() => {
        if (!database) return null;
        const requiredForAppData = getRequiredTablesForPage('estimator', undefined, database);
        const allTablesPresent = requiredForAppData.every(t => {
            const table = database[t];
            return table && typeof table === 'object' && 'data' in table && Array.isArray(table.data);
        });
        if (allTablesPresent) {
            return transformDatabaseToAppData(database as Database);
        }
        // テーブルがまだ読み込まれていない場合はnullを返す（エラーではなく、読み込み中の状態）
        return null;
    }, [database]);

    const suspenseFallback = (
      <div className="flex h-full w-full items-center justify-center bg-base-200 dark:bg-base-dark">
        <div className="text-center">
            <SpinnerIcon className="w-12 h-12 mx-auto text-brand-primary" />
            <p className="mt-4 text-lg font-semibold">ツールを読み込み中...</p>
        </div>
      </div>
    );

    if (!database || !currentUser) {
        return suspenseFallback;
    }

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'hub': return <HubPage />;
            case 'proofing': return <ProofingTool canvases={proofingCanvases} setCanvases={setProofingCanvases} />;
            case 'worksheet': return <WorksheetGenerator proofingCanvases={proofingCanvases} />;
            case 'data-io': return <DataIO />;
            case 'image-converter': return <ImageFileNameConverter database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'image-batch-linker': return <ImageBatchLinker database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'order-management': return <OrderManagementTool onNavigate={navigate} />;
            case 'estimator': return <EstimatorPageV2Container onNavigate={navigate} proofingCanvases={proofingCanvases} />;
            case 'accounts-receivable': return <AccountsReceivableTool />;
            case 'accounts-payable': return <AccountsPayableTool database={database} setDatabase={setDatabase} />;
            case 'cash-flow-analysis': return <CashFlowTool database={database as Database} />;
            case 'task-analysis': return <TaskAnalysisTool database={database} />;
            case 'work-record': return <WorkRecordTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} currentUser={currentUser} />;
            case 'production-scheduler': return <ProductionScheduler />;
            case 'production-settings': return <ProductionSettingsTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'tool-guide': return <ToolGuide />;
            case 'print-history': return <PrintHistoryTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'ink-mixing': return <InkMixingTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'ink-series-management': return <InkSeriesManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'ink-product-management': return <InkProductManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'color-library-manager': return <ColorLibraryManager />;
            case 'pricing-manager': return <PricingManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} currentUser={currentUser} />;
            case 'pricing-assistant': return <PricingAssistant database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'user-manager': return <UserManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'permission-manager': return <PermissionManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'id-manager': return <IdManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'language-manager': return <LanguageManager />;
            case 'dtf-cost-calculator':
                if (!appData) return suspenseFallback;
                return <DtfLogicTool appData={appData} database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'pdf-template-manager': return <PdfTemplateManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'pdf-item-group-manager': return <PdfItemGroupManager database={database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Partial<Database> | null>>} />;
            case 'pdf-preview-settings': return <PdfPreviewSettingsTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'system-logs': return <LogViewer database={database as Database} />;
            case 'dev-tools': return <DevTools appMode={appMode} setAppMode={setAppMode} database={database as Database} />;
            case 'dev-management': return <DevManagementTool />;
            case 'dev-lock-manager': return <DevLockManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} allTools={ALL_TOOLS} />;
            case 'backup-manager': return <BackupManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'product-definition-tool': return <ProductDefinitionTool setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'product-definition-manufacturer-tool': return <ProductDefinitionManufacturerTool setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'product-management': return <ProductManagementTool />;
            case 'inventory-management': return <InventoryManagementTool />;
            case 'estimator-settings': return <EstimatorSettingsTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'customer-management': return <CustomerManagementTool />;
            case 'tool-dependency-manager': return <ToolDependencyManager database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} allTools={ALL_TOOLS} />;
            case 'calculation-logic-manager': return <CalculationLogicManager />;
            case 'task-settings': return <TaskSettingsTool database={database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Partial<Database> | null>>} />;
            case 'email-tool': return <EmailManagementTool />;
            case 'ai-task-management': return <AITaskManager />;
            case 'google-api-settings': return <GoogleApiSettingsTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} isGapiReady={isGapiReady} />;
            case 'email-settings': return <EmailSettingsTool database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />;
            case 'tool-dependency-scanner': return <ToolDependencyScanner />;
            case 'silkscreen-logic-tool': return appData ? <SilkscreenLogicTool appData={appData} database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} /> : suspenseFallback;
            case 'dtf-logic-tool': return appData ? <DtfLogicTool appData={appData} database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} /> : suspenseFallback;
            case 'shipping-logic-tool': return appData ? <ShippingLogicTool appData={appData} database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} /> : suspenseFallback;
            case 'architecture-designer': return <ArchitectureDesigner />;
            case 'display-settings': return <DisplaySettingsTool onLiveUpdate={handleLiveUpdate} onClearLiveUpdate={handleClearLiveUpdate} />;
            case 'php-info-viewer': return <PhpInfoViewer />;
            case 'system-diagnostics': return <SystemDiagnosticsTool />;
            case 'module-list': return <ModuleCatalogTool />;
            case 'unregistered-module-tool': 
            case 'development-workflow': 
                 return (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <h2 className="text-2xl font-bold">開発中</h2>
                            <p className="text-muted mt-2">このツールは現在開発中です。</p>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">ツールが見つかりません</h2>
                            <p className="text-muted mt-2">ページ: {currentPage}</p>
                        </div>
                    </div>
                );
        }
    };

    return <Suspense fallback={suspenseFallback}>{renderCurrentPage()}</Suspense>;
};
