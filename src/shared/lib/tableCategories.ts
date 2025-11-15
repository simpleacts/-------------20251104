export const tableCategories: Record<string, string[]> = {
    '受注管理': ['customers', 'quotes', 'quote_items', 'quote_designs', 'quote_history', 'quote_tasks'],
    '受注ステータス設定': ['quote_status_master', 'payment_status_master', 'production_status_master', 'shipping_status_master', 'data_confirmation_status_master'],
    '商品マスター': ['products_master', 'product_details', 'product_tags', 'stock', 'incoming_stock'],
    // 注意: product_prices, product_colors, skusは非推奨（stockテーブルから取得）
    '商品定義': ['manufacturers', 'categories', 'tags'],
    '印刷設定': ['print_locations', 'print_size_constraints', 'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size', 'additional_print_costs_by_location', 'additional_print_costs_by_tag', 'category_print_locations'],
    '価格設定': ['pricing_rules', 'pricing_assignments', 'volume_discount_schedules', 'print_pricing_tiers', 'print_cost_combination', 'plate_cost_combination', 'shipping_costs', 'print_pricing_schedules', 'category_pricing_schedules'],
    '製造管理': ['print_history', 'print_history_positions', 'print_history_images', 'print_location_metrics'],
    'インク管理': ['ink_recipes', 'ink_recipe_components', 'ink_products', 'ink_series', 'ink_manufacturers', 'pantone_colors', 'dic_colors', 'ink_recipe_usage'],
    'システム設定': [
        'settings', 'color_settings', 'layout_settings', 'behavior_settings', 'pagination_settings', 'company_info', 
        'partner_codes', 'customer_groups', 'shipping_carriers', 'prefectures', 'importer_mappings', 
        'filename_rule_presets', 'users', 'roles', 'role_permissions', 'id_formats', 'pdf_templates', 
        'pdf_item_display_configs', 'pdf_preview_zoom_configs', 'additional_options', 'app_logs', 'dev_locks', 
        'sql_export_presets', 'google_api_settings', 'email_accounts', 'ai_settings', 'email_templates', 
        'email_settings', 'email_general_settings', 'email_labels', 'email_label_ai_rules', 'google_fonts', 
        'language_settings', 'languages', 'icons', 'gemini_models', 'tool_visibility_settings', 'mobile_tool_mappings'
    ],
    'ギャラリー': ['gallery_images', 'gallery_tags'],
    'DTF設定': ['dtf_consumables', 'dtf_equipment', 'dtf_labor_costs', 'dtf_press_time_costs', 'dtf_electricity_rates', 'dtf_printers', 'dtf_print_speeds'],
    '開発管理': [
        'dev_roadmap', 'dev_constitution', 'dev_guidelines_recommended', 'dev_guidelines_prohibited', 'tool_migrations', 
        'development_workflow', 'tool_dependencies', 'modules_core', 'modules_page_tool', 'modules_service', 'modules_other', 
        'modules_ui_atoms', 'modules_ui_molecules', 'modules_ui_organisms', 'modules_ui_modals'
    ],
    'タスク管理': ['task_master', 'task_generation_rules', 'task_time_settings'],
    '経理': ['bills', 'bill_items', 'invoice_parsing_templates'],
    'メール': ['emails', 'email_attachments'],
    '作業記録': ['work_sessions', 'work_session_quotes'],
};


