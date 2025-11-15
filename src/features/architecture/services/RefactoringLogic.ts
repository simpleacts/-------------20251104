// @ts-nocheck

// NOTE: This list needs to be manually maintained. If new files are added to the project,
// they must be added here to be included in the process.
export const ALL_PROJECT_FILES = [
    'App.tsx', 'PrintableEstimate.tsx', 'api/app-data.php.txt', 'api/backup_database.php.txt', 
    'api/db_connect.php.txt', 'api/fetch_emails.php.txt', 'api/gemini-proxy.php.txt', 'api/generate-pdf.php.txt', 
    'api/import-generic.php.txt', 'api/import-stock.php.txt', 'api/send_mail.php.txt', 'api/update-data.php.txt', 
    'api/update_quote.php.txt', 'components/AppLayout.tsx', 'components/AppManager.tsx', 
    'components/BackupManager.tsx', 'components/BehaviorSettings.tsx', 'components/ColorSettings.tsx', 
    'components/CommandPalette.tsx', 'components/DataTable.tsx', 
    'components/DependencyEditModal.tsx', 'components/DevLockManager.tsx', 'components/DevManagementTool.tsx', 
    'components/DevTools.tsx', 'components/EditQuoteModal.tsx', 'components/ErrorDisplay.tsx', 
    'components/ErrorBoundary.tsx', 'components/ForgotPasswordModal.tsx', 'components/HubPage.tsx', 
    'components/LayoutSettings.tsx', 'components/Login.tsx', 'components/MemoryMonitor.tsx', 
    'components/ModuleListTool.tsx', 'components/OrderCsvExporterModal.tsx', 'components/PaginationSettingsTool.tsx', 
    'components/PrintDesignForm.tsx', 'components/PrintManager.tsx', 'components/PrintSettingsTool.tsx', 
    'components/PrintableEstimate.tsx', 'components/ProductSelectionPage.tsx', 'components/QueryGenerator.tsx', 
    'components/QuoteTypeSelector.tsx', 'components/Routes.tsx', 'components/SaveChangesToCsvModal.tsx', 
    'components/SchemaEditor.tsx', 'components/ShippingLogicTool.tsx', 'components/ShippingNotificationModal.tsx', 
    'components/Sidebar.tsx', 'components/ToolExporter.tsx', 'components/ToolPortingManager.tsx', 
    'components/ToolVisibilitySettings.tsx', 'components/UnregisteredModuleTool.tsx', 
    'components/accounts-payable/modals/AddBillModal.tsx', 'components/accounts-payable/modals/InvoiceSplitModal.tsx', 
    'components/accounts-payable/organisms/AccountsPayableList.tsx', 'components/accounts-payable/templates/AccountsPayableTool.tsx', 
    'components/architecture/templates/ArchitectureDesigner.tsx', 'components/architecture/services/RefactoringLogic.ts', 
    'components/aitaskmanagement/organisms/AIReplyAssistant.tsx', 'components/aitaskmanagement/organisms/AITriageView.tsx', 
    'components/aitaskmanagement/organisms/TaskList.tsx', 'components/aitaskmanagement/templates/AITaskManager.tsx', 
    'components/backup-manager/templates/BackupManager.tsx', 'components/cash-flow/organisms/CashFlowSummary.tsx', 
    'components/cash-flow/templates/CashFlowTool.tsx', 'components/customermanagement/molecules/CustomerCard.tsx', 
    'components/customermanagement/modals/CustomerDetailsModal.tsx', 'components/customermanagement/modals/CustomerSearchModal.tsx', 
    'components/customermanagement/modals/EditCustomerModal.tsx', 'components/customermanagement/organisms/CustomerGrid.tsx', 
    'components/customermanagement/organisms/CustomerToolbar.tsx', 'components/customermanagement/templates/CustomerManagementTool.tsx', 
    'components/data-io/services/appWorker.ts', 'components/data-io/services/workerService.ts', 
    'components/data-io/templates/DataIO.tsx', 'components/data-io/templates/ImageBatchLinker.tsx', 
    'components/data-io/templates/ImageFileNameConverter.tsx', 'components/data-io/utils/csv.ts', 
    'components/devtools/AppModeSettings.tsx', 'components/devtools/CsvRewriteSettings.tsx', 
    'components/devtools/HookUnitTests.tsx', 'components/display-settings/hooks/useAppSettings.ts', 
    'components/display-settings/hooks/useThemeManager.ts', 'components/display-settings/organisms/BehaviorSettings.tsx', 
    'components/display-settings/organisms/ColorSettings.tsx', 'components/display-settings/organisms/LayoutSettings.tsx', 
    'components/display-settings/organisms/ToolVisibilitySettings.tsx', 'components/display-settings/templates/DisplaySettingsTool.tsx', 
    'components/display-settings/types/settings.ts', 'components/document/hooks/useDocumentData.ts', 
    'components/document/molecules/DocumentCard.tsx', 'components/document/molecules/DocumentFilter.tsx', 
    'components/document/organisms/DocumentListPanel.tsx', 'components/document/organisms/DocumentPreviewPanel.tsx', 
    'components/document/templates/DocumentManager.tsx', 'components/dtf/DtfCostSettings.tsx', 
    'components/dtf/DtfInputs.tsx', 'components/dtf/DtfPriceSettings.tsx', 'components/dtf/DtfResult.tsx', 
    'components/dtf/organisms/DtfCostSettings.tsx', 'components/dtf/organisms/DtfInputs.tsx', 
    'components/dtf/organisms/DtfPriceSettings.tsx', 'components/dtf/organisms/DtfResult.tsx', 
    'components/dtf/services/dtfService.ts', 'components/dtf/templates/DtfCostCalculatorTool.tsx', 
    'components/dtf/templates/DtfLogicTool.tsx', 'components/dtf/templates/DtfPriceCalculator.tsx', 'components/dtf/types/index.ts', 
    'components/email/modals/ImageAttachmentModal.tsx', 'components/email/molecules/EmailListItem.tsx', 
    'components/email/organisms/EmailComposer.tsx', 'components/email/organisms/EmailDetailPanel.tsx', 
    'components/email/organisms/EmailListPanel.tsx', 'components/email/organisms/EmailSidebar.tsx', 
    'components/email/templates/EmailTool.tsx', 'components/emailmanagement/modals/EditEmailAccountModal.tsx', 
    'components/emailmanagement/modals/ImageAttachmentModal.tsx', 'components/emailmanagement/molecules/EmailListItem.tsx', 
    'components/emailmanagement/organisms/EmailComposer.tsx', 'components/emailmanagement/organisms/EmailDetailPanel.tsx', 
    'components/emailmanagement/organisms/EmailListPanel.tsx', 'components/emailmanagement/organisms/EmailSidebar.tsx', 
    'components/emailmanagement/templates/AIEmailSettingsTool.tsx', 'components/emailmanagement/templates/EmailAccountSettingsTool.tsx', 
    'components/emailmanagement/templates/EmailManagementTool.tsx', 'components/emailmanagement/templates/EmailSettingsTool.tsx', 
    'components/estimator/BringInItemRow.tsx', 'components/estimator/CalculationLogicManager.tsx', 
    'components/estimator/CustomerInfoSection.tsx', 'components/estimator/EstimationResultPanel.tsx', 
    'components/estimator/EstimatorPage.tsx', 'components/estimator/FreeInputItemRow.tsx', 
    'components/estimator/ProductDiscountSection.tsx', 'components/estimator/ProcessingGroupSection.tsx', 
    'components/estimator/QuoteIssuanceSection.tsx', 'components/estimator/SampleItemRow.tsx', 
    'components/estimator/atoms/QuoteTypeSelector.tsx', 'components/estimator/molecules/BringInItemRow.tsx', 
    'components/estimator/molecules/FreeInputItemRow.tsx', 'components/estimator/molecules/ProductDiscountSection.tsx', 
    'components/estimator/molecules/ProductQuantityInputMobile.tsx', 'components/estimator/molecules/ProductQuantityMatrix.tsx', 
    'components/estimator/molecules/SampleItemRow.tsx', 'components/estimator/modals/AdditionalOptionsModal.tsx', 
    'components/estimator/modals/PrintDesignForm.tsx', 'components/estimator/modals/ProductSelectionPage.tsx', 
    'components/estimator/organisms/CostSummary.tsx', 'components/estimator/organisms/CustomerInfoSection.tsx', 
    'components/estimator/organisms/EstimationResultPanel.tsx', 'components/estimator/organisms/ProcessingGroupSection.tsx', 
    'components/estimator/organisms/QuoteIssuanceSection.tsx', 'components/estimator/services/additionalOptionsService.ts', 
    'components/estimator/services/dtfService.ts', 'components/estimator/services/estimateService.ts', 
    'components/estimator/services/estimatorDataTransformer.ts', 'components/estimator/services/productService.ts', 
    'components/estimator/services/shippingService.ts', 'components/estimator/services/silkscreenService.ts', 
    'components/estimator/services/unitPriceService.ts', 'components/estimator/templates/EstimatorLayout.tsx', 
    'components/estimator-settings/templates/EstimatorSettingsTool.tsx', 'components/google-api-settings/organisms/GeminiApiSettings.tsx', 
    'components/google-api-settings/organisms/GoogleWorkspaceSettings.tsx', 'components/google-api-settings/services/googleApiService.ts', 
    'components/google-api-settings/services/googleDriveService.ts', 'components/google-api-settings/templates/GoogleApiSettingsTool.tsx', 
    'components/icons.tsx', 'components/id-manager/atoms/IdFormatPreview.tsx', 'components/id-manager/lib/constants.ts', 
    'components/id-manager/molecules/IdFormatDisplayRow.tsx', 'components/id-manager/molecules/IdFormatEditRow.tsx', 
    'components/id-manager/organisms/IdFormatList.tsx', 'components/id-manager/organisms/IdFormatSettingsEditor.tsx', 
    'components/id-manager/services/idService.ts', 'components/id-manager/templates/IdManager.tsx', 
    'components/image-batch-linker/templates/ImageBatchLinker.tsx', 'components/image-file-name-converter/templates/ImageFileNameConverter.tsx', 
    'components/ink-mixing/management/templates/ColorLibraryManager.tsx', 'components/ink-mixing/management/templates/InkProductManager.tsx', 
    'components/ink-mixing/management/templates/InkSeriesManager.tsx', 'components/ink-mixing/mixing/templates/InkMixingTool.tsx', 
    'components/language-manager/templates/LanguageManager.tsx', 'components/language-manager/types/language.ts', 
    'components/ordermanagement/molecules/QuoteCard.tsx', 'components/ordermanagement/modals/EditQuoteModal.tsx', 
    'components/ordermanagement/modals/OrderDetailsModal.tsx', 'components/ordermanagement/modals/TaskAssignmentModal.tsx', 
    'components/ordermanagement/organisms/CompletionFlowTool.tsx', 'components/ordermanagement/organisms/KanbanColumn.tsx', 
    'components/ordermanagement/organisms/ProductionFlowTool.tsx', 'components/ordermanagement/organisms/SalesFlowTool.tsx', 
    'components/ordermanagement/templates/OrderManagementTool.tsx', 'components/pdf-item-group-manager/templates/PdfItemGroupManager.tsx', 
    'components/pdf-preview-settings/templates/PdfPreviewSettingsTool.tsx', 'components/pdf-template-manager/modals/AiLayoutModal.tsx', 
    'components/pdf-template-manager/modals/DataFieldSelectionModal.tsx', 'components/pdf-template-manager/molecules/DraggableBlock.tsx', 
    'components/pdf-template-manager/organisms/LayoutBuilder.tsx', 'components/pdf-template-manager/organisms/PdfPreview.tsx', 
    'components/pdf-template-manager/organisms/PdfRenderer.tsx', 'components/pdf-template-manager/organisms/SettingsPanel.tsx', 
    'components/pdf-template-manager/templates/PdfTemplateManager.tsx', 'components/pricing-management/hooks/usePricingManager.ts', 
    'components/pricing-management/molecules/PricingTableActions.tsx', 'components/pricing-management/modals/BasicPricingSettingsModal.tsx', 
    'components/pricing-management/modals/PricingSchedulePdfModal.tsx', 'components/pricing-management/modals/ScheduleEditModal.tsx', 
    'components/pricing-management/organisms/PricingTable.tsx', 'components/pricing-management/templates/PricingAssistant.tsx', 
    'components/pricing-management/templates/PricingManager.tsx', 'components/printhistory/molecules/DesignHistoryForm.tsx', 
    'components/printhistory/molecules/HistoryEntryCard.tsx', 'components/printhistory/modals/PositionMeasurementModal.tsx', 
    'components/printhistory/organisms/HistoryControlPanel.tsx', 'components/printhistory/organisms/HistoryList.tsx', 
    'components/printhistory/organisms/NewHistoryForm.tsx', 'components/printhistory/templates/PrintHistoryTool.tsx', 
    'components/product/ProductQuantityInputMobile.tsx', 'components/product/ProductQuantityMatrix.tsx', 
    'components/productdefinition/modals/DefinitionEditModal.tsx', 'components/productdefinition/templates/ProductDefinitionTool.tsx', 
    'components/productmanagement/hooks/useProductManagement.ts', 'components/productmanagement/molecules/EditableField.tsx', 
    'components/productmanagement/molecules/ProductCard.tsx', 'components/productmanagement/modals/AddProductGroupModal.tsx', 
    'components/productmanagement/modals/DeleteConfirmationModal.tsx', 'components/productmanagement/modals/ImageAssignerModal.tsx', 
    'components/productmanagement/organisms/ProductGrid.tsx', 'components/productmanagement/organisms/ProductManager.tsx', 
    'components/productmanagement/organisms/ProductToolbar.tsx', 'components/productmanagement/templates/ProductManagementTool.tsx', 
    'components/production-settings/templates/ProductionSettingsTool.tsx', 'components/productionscheduler/molecules/TaskBar.tsx', 
    'components/productionscheduler/organisms/GanttChart.tsx', 'components/productionscheduler/organisms/QuoteListPanel.tsx', 
    'components/productionscheduler/templates/ProductionScheduler.tsx', 'components/proofingtool/atoms/CanvasPreview.tsx', 
    'components/proofingtool/molecules/DraggableResizableImage.tsx', 'components/proofingtool/modals/DesignSelectionModal.tsx', 
    'components/proofingtool/modals/ExportPreviewModal.tsx', 'components/proofingtool/modals/OrderSearchModal.tsx', 
    'components/proofingtool/templates/ProofingTool.tsx', 'components/proofingtool/utils/canvasExporter.ts', 
    'components/proofingtool/utils/imageUtils.ts', 'components/proofingtool/utils/transformStore.ts', 
    'components/receivables/hooks/useConsolidatedInvoices.ts', 'components/receivables/hooks/useReceivables.ts', 
    'components/receivables/molecules/ConsolidatedInvoiceFilters.tsx', 'components/receivables/molecules/ConsolidatedInvoiceTable.tsx', 
    'components/receivables/molecules/ConsolidatedSummary.tsx', 'components/receivables/molecules/ReceivablesTable.tsx', 
    'components/receivables/modals/PaymentDateModal.tsx', 'components/receivables/organisms/AccountsReceivable.tsx', 
    'components/receivables/organisms/ConsolidatedInvoiceIssuance.tsx', 'components/receivables/organisms/ReceivablesManagement.tsx', 
    'components/receivables/parts/ConsolidatedInvoiceFilters.tsx', 'components/receivables/parts/ConsolidatedInvoiceTable.tsx', 
    'components/receivables/parts/ConsolidatedSummary.tsx', 'components/receivables/parts/PaymentDateModal.tsx', 
    'components/receivables/parts/ReceivablesTable.tsx', 'components/receivables/templates/AccountsReceivableTool.tsx', 
    'components/services/geminiService.ts', 'components/services/idbService.ts', 'components/shared/modal/AddRowModal.tsx', 
    'components/silkscreen/services/silkscreenService.ts', 'components/silkscreen/templates/SilkscreenLogicTool.tsx', 
    'components/system-logs/modals/DependencyEditModal.tsx', 'components/system-logs/templates/LogViewer.tsx', 
    'components/task-settings/modals/TaskAssignmentModal.tsx', 'components/task-settings/templates/TaskSettingsTool.tsx', 
    'components/taskanalysis/modals/TaskListModal.tsx', 'components/taskanalysis/organisms/TaskProgressGraph.tsx', 
    'components/taskanalysis/templates/TaskAnalysisTool.tsx', 'components/tool-guide/content/DataIOGuide.tsx', 
    'components/tool-guide/content/FileNameConverterGuide.tsx', 'components/tool-guide/content/ImageBatchLinkerGuide.tsx', 
    'components/tool-guide/content/ToolDependencyManagerGuide.tsx', 'components/tool-guide/templates/ToolGuide.tsx', 
    'components/ui/AIQueryForm.tsx', 'components/ui/Alert.tsx', 'components/ui/Badge.tsx', 'components/ui/BulkEditModal.tsx', 
    'components/ui/Button.tsx', 'components/ui/Card.tsx', 'components/ui/Checkbox.tsx', 'components/ui/ColorInput.tsx', 
    'components/ui/DisplayCell.tsx', 'components/ui/EditableCell.tsx', 'components/ui/EditableField.tsx', 
    'components/ui/FileUploadZone.tsx', 'components/ui/GuideStep.tsx', 'components/ui/ImageAssignmentRow.tsx', 
    'components/ui/Input.tsx', 'components/ui/Label.tsx', 'components/ui/Modal.tsx', 'components/ui/OrderDetailRow.tsx', 
    'components/ui/PageHeader.tsx', 'components/ui/Pagination.tsx', 'components/ui/ProductCard.tsx', 
    'components/ui/ProgressBar.tsx', 'components/ui/RadioGroup.tsx', 'components/ui/SearchInput.tsx', 'components/ui/Select.tsx', 
    'components/ui/Separator.tsx', 'components/ui/SettingsCard.tsx', 'components/ui/Skeleton.tsx', 'components/ui/Spinner.tsx', 
    'components/ui/StatusBadge.tsx', 'components/ui/TableActionButtons.tsx', 'components/ui/Textarea.tsx', 
    'components/ui/ToggleSwitch.tsx', 'components/ui/Tooltip.tsx', 'components/usermanagement/modals/FieldVisibilityModal.tsx', 
    'components/usermanagement/modals/UserEditModal.tsx', 'components/usermanagement/templates/PermissionManager.tsx', 
    'components/usermanagement/templates/UserManager.tsx', 'components/workrecord/contexts/WorkTimerContext.tsx', 
    'components/workrecord/hooks/useWorkTimer.ts', 'components/workrecord/modals/QuoteSelectionModal.tsx', 
    'components/workrecord/modals/TaskSelectionModal.tsx', 'components/workrecord/molecules/ActiveTimer.tsx', 
    'components/workrecord/molecules/UnsavedLogForm.tsx', 'components/workrecord/molecules/WorkHistoryItem.tsx', 
    'components/workrecord/organisms/WorkTimerManager.tsx', 'components/workrecord/templates/WorkRecordTool.tsx', 
    'components/worksheet/hooks/useWorksheetData.ts', 'components/worksheet/organisms/Worksheet.tsx', 
    'components/worksheet/organisms/WorksheetConfigPanel.tsx', 'components/worksheet/organisms/WorksheetPreview.tsx', 
    'components/worksheet/templates/WorksheetGenerator.tsx', 'contexts/AuthContext.tsx', 'contexts/DatabaseContext.tsx', 
    'contexts/NavigationContext.tsx', 'contexts/SettingsContext.tsx', 'data/db.live.ts', 
    'data/db.ts', 'database_setup.sql.txt', 
    'hooks/useAppDataInitialization.ts', 'hooks/useDevice.ts', 'hooks/useGoogleApi.ts', 'hooks/useHistoryState.ts', 
    'htaccess.txt', 'index.css', 'index.html', 'index.tsx', 'metadata.json', 'package.json', 
    'scripts/build-cleanup.js', 'scripts/prepare-deployment.js', 'templates/additional_options.csv', 
    'templates/additional_print_costs_by_location.csv', 'templates/additional_print_costs_by_size.csv', 
    'templates/additional_print_costs_by_tag.csv', 'templates/ai_settings.csv', 'templates/app_logs.csv', 
    'templates/behavior_settings.csv', 'templates/bill_items.csv', 'templates/bills.csv', 'templates/common/brands.csv', 
    'templates/categories.csv', 'templates/category_pricing_schedules.csv', 'templates/category_print_locations.csv', 
    'templates/color_settings.csv', 'templates/colors.csv', 'templates/company_info.csv', 'templates/customer_groups.csv', 
    'templates/customers.csv', 'templates/data_confirmation_status_master.csv', 'templates/database_setup.sql.txt', 
    'templates/dev_constitution.csv', 'templates/dev_guidelines_prohibited.csv', 'templates/dev_guidelines_recommended.csv', 
    'templates/dev_locks.csv', 'templates/dev_roadmap.csv', 'templates/dic_colors.csv', 'templates/display_settings.csv', 
    'templates/dtf_consumables.csv', 'templates/dtf_electricity_rates.csv', 'templates/dtf_equipment.csv', 
    'templates/dtf_labor_costs.csv', 'templates/dtf_press_time_costs.csv', 'templates/dtf_print_speeds.csv', 
    'templates/dtf_printers.csv', 'templates/email_accounts.csv', 'templates/email_attachments.csv', 
    'templates/email_general_settings.csv', 'templates/email_templates.csv', 'templates/emails.csv', 
    'templates/filename_rule_presets.csv', 'templates/gallery_images.csv', 'templates/gallery_tags.csv', 
    'templates/google_api_settings.csv', 'templates/icons.csv', 'templates/id_formats.csv', 'templates/importer_mappings.csv', 
    'templates/incoming_stock.csv', 'templates/ink_base_colors.csv', 'templates/ink_manufacturers.csv', 
    'templates/ink_products.csv', 'templates/ink_recipe_components.csv', 'templates/ink_recipe_usage.csv', 
    'templates/ink_recipes.csv', 'templates/ink_series.csv', 'templates/invoice_parsing_templates.csv', 
    'templates/language_settings.csv', 'templates/languages.csv', 'templates/layout_settings.csv', 
    'templates/manufacturers.csv', 'templates/mobile_tool_mappings.csv', 'templates/modules_core.csv', 
    'templates/modules_other.csv', 'templates/modules_page_tool.csv', 'templates/modules_service.csv', 
    'templates/modules_ui_atoms.csv', 'templates/modules_ui_modals.csv', 'templates/modules_ui_molecules.csv', 
    'templates/modules_ui_organisms.csv', 'templates/pagination_settings.csv', 'templates/pantone_colors.csv', 
    'templates/partner_codes.csv', 'templates/payment_status_master.csv', 'templates/pdf_item_display_configs.csv', 
    'templates/pdf_preview_zoom_configs.csv', 'templates/pdf_templates.csv', 'templates/plate_cost_combination.csv', 
    'templates/plate_costs.csv', 'templates/post_categories.csv', 'templates/post_tag_relations.csv', 
    'templates/post_tags.csv', 'templates/posts.csv', 'templates/prefectures.csv', 'templates/pricing_assignments.csv', 
    'templates/pricing_rules.csv', 'templates/print_cost_combination.csv', 'templates/print_history.csv', 
    'templates/print_history_images.csv', 'templates/print_history_positions.csv', 'templates/print_location_metrics.csv', 
    'templates/print_locations.csv', 'templates/print_pricing_schedules.csv', 'templates/print_pricing_tiers.csv', 
    'templates/print_size_constraints.csv', 'templates/product_details.csv', 
    // 注意: product_colors, product_pricesは非推奨（stockテーブルから取得） 
    'templates/product_tags.csv', 'templates/production_status_master.csv', 'templates/products_master.csv', 
    'templates/quote_designs.csv', 'templates/quote_history.csv', 'templates/quote_items.csv', 
    'templates/quote_status_master.csv', 'templates/quote_tasks.csv', 'templates/quotes.csv', 
    'templates/role_permissions.csv', 'templates/roles.csv', 'templates/server_config.csv', 'templates/settings.csv', 
    'templates/shipping_carriers.csv', 'templates/shipping_costs.csv', 'templates/shipping_status_master.csv', 
    'templates/sizes.csv', 'templates/skus.csv', 'templates/special_ink_costs.csv', 'templates/sql_export_presets.csv', 
    'templates/stock.csv', 'templates/tags.csv', 'templates/task_generation_rules.csv', 'templates/task_master.csv', 
    'templates/task_time_settings.csv', 'templates/tool_dependencies.csv', 'templates/tool_migrations.csv', 
    'templates/tool_visibility_settings.csv', 'templates/users.csv', 'templates/vendors.csv', 'templates/volume_discount_schedules.csv', 
    'templates/work_session_quotes.csv', 'templates/work_sessions.csv', 'toolGroups.tsx', 'types/accounting.ts', 'types/app.ts', 
    'types/common.ts', 'types/dev.ts', 'types/email.ts', 'types/estimator.ts', 'types/fileConverter.ts', 'types/index.ts', 
    'types/ink.ts', 'types/pdf.ts', 'types/product.ts', 'types/proofing.ts', 'types/quote.ts', 'types/seo.ts', 
    'types/settings.ts', 'types/tasks.ts', 'types/work.ts', 'utils/colorUtils.ts', 'utils/estimatorDataTransformer.ts',
];

async function getAllFileContents(setStatus: (status: string) => void): Promise<{ path: string, content: string }[]> {
    const promises = ALL_PROJECT_FILES.map(async (path, index) => {
        setStatus(`ファイルを読み込み中... (${index + 1}/${ALL_PROJECT_FILES.length})`);
        try {
            const response = await fetch(`/${path}`);
            if (!response.ok) {
                console.warn(`File not found, skipping: ${path}`);
                return null;
            }
            const content = await response.text();
            return { path, content };
        } catch (error) {
            console.warn(`Error fetching file ${path}:`, error);
            return null;
        }
    });
    const results = await Promise.all(promises);
    return results.filter((r): r is { path: string, content: string } => r !== null);
}

export async function generateAiPromptFile(setStatus: (status: string) => void): Promise<void> {
    setStatus('すべてのファイルの内容を読み込んでいます...');
    const allFiles = await getAllFileContents(setStatus);

    setStatus('プロンプトを生成中...');
    let promptContent = `以下の指示に従って、プロジェクト内のすべてのファイルのインポートパスを更新してください。\n\n`;
    promptContent += `## 指示\n`;
    promptContent += `1. 提供されたファイルリストと各ファイルの内容をよく確認してください。\n`;
    promptContent += `2. すべてのファイル内の \`import\` 文および \`export ... from\` 文のパスを、現在のファイルからの正しい相対パスに修正してください。\n`;
    promptContent += `3. パスは必ず \`./\` または \`../\` から始まる相対パスにしてください。\n`;
    promptContent += `4. 修正が必要なファイルのみを、指定されたXML形式で出力してください。\n\n`;
    promptContent += `## プロジェクトの全ファイルリスト\n`;

    allFiles.forEach(file => {
        promptContent += `${file.path}\n`;
    });

    promptContent += `\n\n## 各ファイルの内容\n\n`;

    allFiles.forEach(file => {
        promptContent += `--- START OF FILE ${file.path} ---\n`;
        promptContent += file.content;
        promptContent += `\n--- END OF FILE ${file.path} ---\n\n`;
    });

    setStatus('ダウンロードを準備中...');
    const blob = new Blob([promptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai_path_update_prompt.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus('プロンプトのダウンロードが完了しました。');
}
