import React, { useState } from 'react';
// FIX: Corrected import path.
import { Database } from '../types';
import { CheckIcon, ClipboardDocumentCheckIcon, XMarkIcon } from '../ui/atoms/icons';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    database: Database;
}

const SaveChangesToCsvModal: React.FC<Props> = ({ isOpen, onClose, database }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const promptText = `
以下のJSONデータは、アプリケーションの現在のデータベース状態を表しています。
このデータに基づいて、プロジェクト内の \`/templates\` ディレクトリにある各CSVファイルを更新してください。

**重要: CSVファイルの保存場所**
- メーカー依存テーブル（sizes, colors, products_master, product_details, product_tags, stock, incoming_stock, importer_mappings）: \`templates/manufacturers/manu_{manufacturer_id}/manu_{manufacturer_id}_{tableName}.csv\` にメーカーごとに分割して保存してください（例: \`templates/manufacturers/manu_0001/manu_0001_stock.csv\`）
- 注意: product_colors, product_prices, skusは非推奨（stockテーブルから取得）
- その他のテーブル: ツールごとのフォルダに保存してください（例: \`templates/product-definition/time_units.csv\`, \`templates/email-management/email_accounts.csv\`）
- 各テーブルの \`data\` 配列を、対応するCSVファイルの内容として書き込んでください
- CSVの1行目はヘッダー行とし、\`schema\` の \`name\` プロパティを使用してください
- 既存のCSVファイルは、このデータで完全に上書きしてください
- データが空のテーブルについては、ヘッダー行のみのCSVファイルを作成してください

**ツールごとのフォルダ構造:**
- \`product-definition/\`: 商品定義関連（time_units, calculation_logic_types, ink_product_types, weight_volume_units, free_input_item_types, color_libraries, color_library_types, payment_methods）
- \`email-management/\`: メール管理関連（email_accounts, email_templates, email_labels, email_attachments, emails, email_general_settings, email_settings, email_label_ai_rules）
- \`task-settings/\`: タスク設定関連（task_master, task_generation_rules, task_time_settings, quote_tasks）
- \`ink-mixing/\`: インク配合管理関連（ink_recipes, ink_recipe_components, ink_recipe_usage, ink_products, ink_series, ink_manufacturers, pantone_colors, dic_colors）
- \`order-management/\`: 業務管理関連（quotes, quote_items, quote_designs, quote_history, quote_status_master, payment_status_master, production_status_master, shipping_status_master, data_confirmation_status_master, shipping_carriers, bills, bill_items）
- \`product-management/\`: 商品データ管理関連（products_master, product_details, product_tags, stock, incoming_stock, importer_mappings）
- 注意: product_prices, product_colors, skusは非推奨（stockテーブルから取得）
- \`pricing/\`: 価格設定関連（plate_costs, special_ink_costs, additional_print_costs_by_size, additional_print_costs_by_location, additional_print_costs_by_tag, print_pricing_tiers, print_pricing_schedules, category_pricing_schedules, pricing_rules, pricing_assignments, volume_discount_schedules, print_cost_combination, plate_cost_combination）
- \`dtf/\`: DTF関連（dtf_consumables, dtf_equipment, dtf_labor_costs, dtf_press_time_costs, dtf_electricity_rates, dtf_printers, dtf_print_speeds）
- \`pdf/\`: PDF関連（pdf_templates, pdf_item_display_configs, pdf_preview_zoom_configs）
- \`print-history/\`: 印刷履歴関連（print_history, print_history_positions, print_history_images, print_location_metrics）
- \`system/\`: システム設定関連（settings, color_settings, layout_settings, behavior_settings, pagination_settings, company_info, partner_codes, google_api_settings, ai_settings, gemini_models, google_fonts, icons, users, roles, role_permissions, id_formats, tool_dependencies, tool_migrations, tool_visibility_settings, mobile_tool_mappings, sql_export_presets, work_sessions, work_session_quotes, app_logs, dev_locks）
- \`dev/\`: 開発ツール関連（dev_constitution, dev_guidelines_recommended, dev_guidelines_prohibited, dev_roadmap）
- \`modules/\`: モジュール管理関連（modules_core, modules_page_tool, modules_service, modules_other, modules_ui_atoms, modules_ui_molecules, modules_ui_organisms, modules_ui_modals）
- \`common/\`: 共通データ（manufacturers, brands, categories, tags, colors, print_locations, print_size_constraints, category_print_locations, prefectures, shipping_costs, customer_groups, customers, additional_options, gallery_images, gallery_tags, filename_rule_presets, invoice_parsing_templates, language_settings, languages）

更新対象のファイルが多数になる場合も、すべてを単一のXMLレスポンスに含めてください。

\`\`\`json
${JSON.stringify(database, null, 2)}
\`\`\`
`;

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">AIにCSVへの書き込みを指示</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6 overflow-y-auto space-y-4">
                    <p className="text-sm">以下のプロンプトをコピーして、AIアシスタントに送信してください。現在のメモリ上の変更が、プロジェクトのCSVファイルに書き込まれます。</p>
                    <textarea
                        readOnly
                        value={promptText.trim()}
                        className="w-full h-80 bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md p-2 text-xs font-mono"
                    />
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">閉じる</button>
                    <button onClick={handleCopy} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800 flex items-center gap-2">
                         {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardDocumentCheckIcon className="w-5 h-5" />}
                         {copied ? 'コピーしました！' : 'プロンプトをコピー'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SaveChangesToCsvModal;