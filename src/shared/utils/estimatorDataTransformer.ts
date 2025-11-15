import { getManufacturerFileName, isManufacturerDependentTable } from '../../core/config/tableNames';
import { getBrandNameForProduct } from '../../core/utils/brandAccess';
import { getAllManufacturerTableData } from '../../core/utils/manufacturerTableAccess';
import { getProductDetailsFromStock, getProductInfoFromStock, getProductsMasterFromStock } from '../../core/utils/stockProductInfo';
import { DtfConsumable, DtfElectricityRate, DtfEquipment, DtfLaborCost, DtfPressTimeCost, DtfPrinter, DtfPrintSettings, DtfPrintSpeed } from '../../features/dtf/types';
import { AdditionalOption, AppData, BrandColor, CompanyInfoData, Database, GalleryImage, PricingData, PrintLocation, PrintPricingTier, PrintSize, Product, Row, SpecialInkType, Table } from '../types';

const transformDatabaseToAppData = (db: Database): AppData | null => {
    try {
        const essentialTables: string[] = [
            // 注意: products_master, product_details, product_tagsは削除済み（stockテーブルから取得）
            'stock', 'tags', 'categories', 'plate_costs',
            // 注意: colors, sizesは削除済み（stockテーブルから取得）- essentialTablesから削除
            // 注意: product_colorsは非推奨（stockテーブルから取得）
            // 注意: brandsは遅延読み込みに移動（商品選択時に必要に応じて読み込む）
            'special_ink_costs', 'additional_print_costs_by_size', 'additional_print_costs_by_location',
            'additional_print_costs_by_tag', 'print_pricing_tiers', 'shipping_costs', 'settings',
            'print_cost_combination', 'plate_cost_combination', 'category_print_locations',
            'print_size_constraints', 'print_locations', 'company_info', 'partner_codes',
            'prefectures', 'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
            'customer_groups', 'additional_options', 'manufacturers', 'dtf_consumables',
            'dtf_equipment', 'dtf_labor_costs', 'dtf_electricity_rates',
            'dtf_printers', 'dtf_print_speeds', 'dtf_press_time_costs'
        ];

        for (const table of essentialTables) {
            // メーカー依存テーブルの場合は、getAllManufacturerTableDataでデータが存在するかチェック
            if (isManufacturerDependentTable(table)) {
                // まず、ベーステーブル名でテーブルが存在するかチェック（統合データ）
                const baseTable = db[table];
                if (baseTable && 'data' in baseTable && Array.isArray(baseTable.data)) {
                    // ベーステーブルが存在する場合は読み込み済み
                    continue;
                }
                
                // manufacturersテーブルが存在しない場合は、まだ読み込まれていない
                const manufacturers = db.manufacturers?.data || [];
                if (manufacturers.length === 0) {
                    // manufacturersテーブルがまだ読み込まれていない場合は待機
                    const availableTables = Object.keys(db).filter(k => db[k] && typeof db[k] === 'object' && 'data' in db[k]);
                    if (availableTables.length > 0) {
                        return null; // 他のテーブルが読み込まれている場合は待機
                    }
                    // テーブルが全く読み込まれていない場合は空のテーブルとして初期化
                    (db as any)[table] = { schema: [], data: [] };
                    continue;
                }
                
                // 少なくとも1つのメーカーでテーブルが存在するかチェック
                const hasAnyManufacturerTable = manufacturers.some((m: any) => {
                    const manufacturerId = m?.id as string;
                    if (!manufacturerId || manufacturerId === 'undefined' || manufacturerId.trim() === '') {
                        return false;
                    }
                    // メーカー別テーブル名を生成してチェック（統一されたファイル名変換関数を使用）
                    const fileName = getManufacturerFileName(table);
                    const manufacturerTableName = `${manufacturerId}_${fileName}`;
                    const manufacturerTable = db[manufacturerTableName];
                    return manufacturerTable && 'data' in manufacturerTable && Array.isArray(manufacturerTable.data);
                });
                
                if (!hasAnyManufacturerTable) {
                    // メーカー別テーブルが存在しない場合は、データがまだ読み込まれていない可能性がある
                    const allData = getAllManufacturerTableData(db, table);
                    if (allData.length === 0) {
                        const availableTables = Object.keys(db).filter(k => db[k] && typeof db[k] === 'object' && 'data' in db[k]);
                        if (availableTables.length > 0) {
                            // 他のテーブルが読み込まれている場合は、このテーブルがまだ読み込み中の可能性が高い
                            return null;
                        }
                    }
                }
                
                // メーカー依存テーブルの場合は、個別のテーブルオブジェクトをチェックする必要はない
                // getAllManufacturerTableDataでデータが取得できればOK、またはメーカー別テーブルが存在すればOK
                continue;
            }
            
            // 通常のテーブルの場合
            if (!db[table]) {
                // テーブルがまだ読み込まれていない場合はnullを返して、呼び出し側で待機させる
                // これにより、テーブルが順次読み込まれる際の不要な警告を防ぐ
                const availableTables = Object.keys(db).filter(k => db[k] && typeof db[k] === 'object' && 'data' in db[k]);
                if (availableTables.length > 0) {
                    // 他のテーブルが読み込まれている場合は、このテーブルがまだ読み込み中の可能性が高い
                    // 警告を出さずにnullを返して、すべてのテーブルが読み込まれるのを待つ
                    return null;
                }
                // テーブルが存在しない場合は空のテーブルとして初期化（エラーを出さずに続行）
                // これにより、テーブルが物理的に存在しない場合でもアプリが動作する
                (db as any)[table] = { schema: [], data: [] };
            }
            // テーブルオブジェクトは存在するが、dataプロパティがない場合もチェック
            const tableData = db[table];
            if (tableData) {
                // テーブルが配列として返されている場合（PHP APIから直接返された場合）を処理
                if (Array.isArray(tableData)) {
                    console.warn(`Essential table "${table}" is an array instead of Table structure. Converting to Table structure.`);
                    (db as any)[table] = { schema: [], data: tableData };
                } else if (!('data' in tableData) || !Array.isArray((tableData as Table).data)) {
                    console.warn(`Essential table "${table}" exists but has invalid structure. Expected Table with data array. Re-initializing as empty table.`);
                    // 無効な構造の場合は空のテーブルとして再初期化
                    (db as any)[table] = { schema: [], data: [] };
                }
            }
        }

        // 注意: product_tagsは削除済み（product_detailsのtagsフィールドで管理）
        // stockテーブルから商品詳細を取得してタグ情報を抽出（後で使用）
        
        // FIX: Add explicit type arguments to new Map() to resolve type inference issue.
        const settingsData = Array.isArray(db.settings) ? db.settings : (db.settings?.data || []);
        const settingsMap = new Map<string, any>(settingsData.map((s: any) => [s.key, s.value] as [string, any]));

        // メーカー依存テーブルから全商品を取得
        // 注意: products_masterは削除済み（stockテーブルから取得）
        const productsMaster = getProductsMasterFromStock(db);
        
        // stockテーブルから全カラーと全サイズを取得（colors, sizesテーブルは削除済み）
        const allStock = getAllManufacturerTableData(db, 'stock');
        
        // 商品IDからブランドIDを取得するマップ（stockテーブルのbrand_idから）
        // 注意: products_masterは削除済み（stockテーブルに統合）
        const productBrandIdMap = new Map<string, { brandId: string; manufacturerId: string }>();
        allStock.forEach((item: any) => {
            const manufacturerId = String(item.manufacturer_id || '');
            const productCode = String(item.product_code || '');
            const brandId = String(item.brand_id || '');
            if (productCode && brandId) {
                const productId = `prod_${manufacturerId}_${productCode}`;
                if (!productBrandIdMap.has(productId)) {
                    productBrandIdMap.set(productId, { brandId, manufacturerId });
                }
            }
        });
        const allColors = Array.from(new Map(
            allStock.map((item: any) => {
                const colorCode = String(item.color_code || '');
                const colorName = String(item.color_name || '');
                const manufacturerId = String(item.manufacturer_id || '');
                if (!colorCode) return null;
                return [`${manufacturerId}_${colorCode}`, {
                    id: `col_${manufacturerId}_${colorCode}`,
                    manufacturer_id: manufacturerId,
                    colorCode: colorCode,
                    colorName: colorName,
                    colorType: 'カラー' as const, // デフォルト値（stockテーブルにはcolorTypeがない）
                    hex: '' // stockテーブルにはhexがない
                }];
            }).filter((item): item is [string, any] => item !== null)
        ).values());
        
        const allSizes = Array.from(new Map(
            allStock.map((item: any) => {
                const sizeCode = String(item.size_code || '');
                const sizeName = String(item.size_name || '');
                const manufacturerId = String(item.manufacturer_id || '');
                if (!sizeCode) return null;
                return [`${manufacturerId}_${sizeCode}`, {
                    id: `size_${manufacturerId}_${sizeCode}`,
                    manufacturer_id: manufacturerId,
                    sizeCode: sizeCode,
                    sizeName: sizeName
                }];
            }).filter((item): item is [string, any] => item !== null)
        ).values());
        // FIX: Add explicit type arguments to new Map() to resolve type inference issue.
        // stockテーブルから商品詳細を取得（product_detailsの代替）
        const allProductDetails = getProductDetailsFromStock(db);
        const productDetails = new Map<string, Row>(allProductDetails.map((d: any) => [d.product_id, d]));
        // product_pricesは非推奨。価格情報はstockテーブルから取得する
        // 注意: product_price_group_itemsは削除済み（価格ラベルは直接判定）
        
        const productTags = new Map<string, string[]>();
        // 注意: product_tagsは削除済み（product_detailsのtagsフィールドで管理）
        // stockテーブルから取得した商品詳細のtagsフィールドからタグ情報を抽出
        allProductDetails.forEach((pd: any) => {
            const productId = pd.product_id as string;
            if (productId && pd.tags) {
                const tags = typeof pd.tags === 'string' ? pd.tags.split(',').map((t: string) => t.trim()) : [];
                if (tags.length > 0) {
                    productTags.set(productId, tags);
                }
            }
        });

        // 注意: product_colorsは非推奨。カラー情報はstockテーブルから取得する

        const transformedProducts: Product[] = productsMaster.map(pm => {
            const details = productDetails.get(pm.id as string);
            // manufacturer_idを直接取得（メーカー主体のデータ構造）
            const manufacturerId = pm.manufacturer_id as string | undefined;
            // ブランドIDからブランド名を取得
            const brandInfo = productBrandIdMap.get(pm.id as string);
            const brandId = pm.brand_id as string | undefined || brandInfo?.brandId;
            const resolvedManufacturerId = manufacturerId || brandInfo?.manufacturerId;
            // ブランド名をbrandsテーブルから取得（brandsテーブルが読み込まれていない場合は空文字列）
            // 注意: brandsテーブルは遅延読み込みのため、読み込まれていない場合がある
            let brandName = '';
            if (brandId && resolvedManufacturerId) {
                try {
                    brandName = getBrandNameForProduct(db, pm.id as string, resolvedManufacturerId);
                } catch (err) {
                    // brandsテーブルが読み込まれていない場合は空文字列のまま
                    console.warn(`[estimatorDataTransformer] Failed to get brand name for product ${pm.id}:`, err);
                }
            }

            // 価格情報とカラー情報はstockテーブルから取得（product_pricesとproduct_colorsは非推奨）
            const productCode = String(pm.productCode || '');
            const pricesForProduct: Array<{
                color: 'ホワイト' | 'カラー' | 'スペシャル';
                size: string;
                listPrice: number;
                purchasePrice: number;
            }> = [];
            const productColors: string[] = [];
            
            if (resolvedManufacturerId && productCode) {
                const stockInfo = getProductInfoFromStock(db, resolvedManufacturerId, productCode);
                // カラー情報を取得
                productColors.push(...stockInfo.colors.map(c => c.code));
                // 価格情報を取得
                stockInfo.prices.forEach((price) => {
                    // カラータイプを判定（簡易版：カラー名から判定）
                    let colorType: 'ホワイト' | 'カラー' | 'スペシャル' = 'カラー';
                    if (price.colorName.toLowerCase().includes('ホワイト') || price.colorName.toLowerCase().includes('white')) {
                        colorType = 'ホワイト';
                    }
                    
                    pricesForProduct.push({
                        color: colorType,
                        size: price.sizeName,
                        listPrice: price.listPrice,
                        purchasePrice: price.costPrice,
                    });
                });
            }
            
            return {
                id: pm.id as string,
                brand: brandName,
                manufacturerId: resolvedManufacturerId ? String(resolvedManufacturerId) : '',
                name: ((details as any)?.name || '') as string,
                description: ((details as any)?.description || '') as string,
                images: (details as any)?.images,
                code: String(pm.productCode),
                jan_code: String(pm.jan_code || ''),
                colors: productColors,
                prices: pricesForProduct,
                tags: productTags.get(pm.id as string) || [],
                categoryId: (pm.category_id || '') as string,
                is_published: !!pm.is_published,
            };
        });

        const productsByBrand = transformedProducts.reduce((acc, p) => {
            if (!acc[p.brand]) acc[p.brand] = [];
            acc[p.brand].push(p);
            return acc;
        }, {} as Record<string, Product[]>);

        // allColorsとallSizesは既に上で定義されているので再利用
        const colorsData = allColors;
        const manufacturersData = db.manufacturers?.data || [];
        const colorsByManufacturer = manufacturersData.reduce((acc, manufacturer) => {
            const manufacturerColors = colorsData.filter((c: any) => c.manufacturer_id === manufacturer.id) || [];
            acc[manufacturer.id as string] = manufacturerColors.reduce((colorAcc, color) => {
                const stringCode = String(color.colorCode);
                colorAcc[stringCode] = {
                    code: stringCode,
                    colorCode: stringCode,
                    name: (color.colorName) as string,
                    colorName: (color.colorName) as string,
                    hex: color.hex as string || '',
                    type: (color.colorType || 'カラー') as 'ホワイト' | 'カラー' | 'スペシャル'
                };
                return colorAcc;
            }, {} as Record<string, BrandColor>);
            return acc;
        }, {} as Record<string, Record<string, BrandColor>>);

        // allSizesは既に上で定義されているので再利用
        const sizesData = allSizes;
        const sizesByManufacturer = manufacturersData.reduce((acc, manufacturer) => {
            const manufacturerSizes = sizesData.filter((s: any) => s.manufacturer_id === manufacturer.id) || [];
            acc[manufacturer.id as string] = manufacturerSizes.reduce((sizeAcc, size) => {
                const stringCode = String(size.sizeCode);
                sizeAcc[stringCode] = { name: size.sizeName as string };
                return sizeAcc;
            }, {} as Record<string, Record<string, { name: string }>>);
            return acc;
        }, {} as Record<string, Record<string, { name: string }>>);

        const stock = (db.stock?.data || []).reduce((acc, s) => {
            acc[`${s.productCode}-${s.colorCode}-${s.sizeCode}`] = s.stockQuantity as number;
            return acc;
        }, {} as Record<string, number>);

        const tags = db.tags.data.map(t => ({ tagId: t.tagId as string, tagName: t.tagName as string })) || [];
        const categories = db.categories.data.map(c => ({ categoryId: c.categoryId as string, categoryName: c.categoryName as string })) || [];

        const pricingData: PricingData = {
            plateCosts: db.plate_costs.data.reduce((acc, p) => {
                acc[`${p.size}-${p.plateType}`] = { cost: p.cost as number, surchargePerColor: p.surchargePerColor as number };
                return acc;
            }, {} as Record<string, { cost: number; surchargePerColor: number; }>),
            specialInkOptions: db.special_ink_costs.data.map(i => ({ type: i.type as SpecialInkType, cost: i.cost as number, displayName: i.displayName as string })),
            specialInkCosts: db.special_ink_costs.data.reduce((acc: Record<string, number>, i) => {
                acc[i.type as SpecialInkType] = i.cost as number;
                return acc;
            }, {}) as Record<SpecialInkType, number>,
            additionalPrintCostsBySize: db.additional_print_costs_by_size.data.reduce((acc, c) => {
                acc[c.size as PrintSize] = c.cost as number;
                return acc;
            }, {} as Partial<Record<PrintSize, number>>),
            additionalPrintCostsByLocation: db.additional_print_costs_by_location.data.reduce((acc, c) => {
                acc[c.location as PrintLocation] = c.cost as number;
                return acc;
            }, {} as Partial<Record<PrintLocation, number>>),
            additionalPrintCostsByTag: db.additional_print_costs_by_tag.data.reduce((acc, t) => {
                acc[t.tagId as string] = t.cost as number;
                return acc;
            }, {} as Record<string, number>),
            printPricingTiers: db.print_pricing_tiers.data.map((p): PrintPricingTier => ({
                id: String(p.id),
                min: p.min as number,
                max: p.max as number,
                firstColor: p.firstColor as number,
                additionalColor: p.additionalColor as number,
                schedule_id: p.schedule_id ? String(p.schedule_id) : undefined,
                user_id: p.user_id ? String(p.user_id) : undefined,
            })),
            shippingCosts: db.shipping_costs.data.reduce((acc, s) => {
                acc[s.region as string] = { cost: s.cost as number, prefectures: ((s.prefectures as string) || '').split(',') };
                return acc;
            }, {} as Record<string, { cost: number; prefectures: string[] }>),
            shippingFreeThreshold: parseInt(String(settingsMap.get('SHIPPING_FREE_THRESHOLD')) || '50000', 10),
            bringInFeeRate: parseFloat(String(settingsMap.get('BRING_IN_FEE_RATE')) || '0.05'),
            printCostCategoryCombinations: db.print_cost_combination.data.reduce((acc, c) => {
                acc[c.category_id as string] = c.combination_id as string;
                return acc;
            }, {} as Record<string, string>),
            plateCostCategoryCombinations: db.plate_cost_combination.data.reduce((acc, c) => {
                acc[c.category_id as string] = c.combination_id as string;
                return acc;
            }, {} as Record<string, string>),
            categoryPrintLocations: db.category_print_locations.data.reduce((acc, c) => {
                acc[c.category_id as string] = ((c.allowed_location_ids as string) || '').split(',');
                return acc;
            }, {} as Record<string, string[]>),
            printSizeConstraints: db.print_size_constraints.data.map(c => ({
                type: c.constraint_type as 'tag' | 'location',
                id: c.constraint_id as string,
                sizes: ((c.allowed_print_sizes as string) || '').split(',') as PrintSize[]
            })),
            pricingRules: db.pricing_rules.data,
            pricingAssignments: db.pricing_assignments.data,
            volumeDiscountSchedules: db.volume_discount_schedules.data,
            defaultSellingMarkup: parseFloat(String(settingsMap.get('DEFAULT_SELLING_MARKUP')) || '0.3'),
            defaultBringInMarkup: parseFloat(String(settingsMap.get('DEFAULT_BRING_IN_MARKUP')) || '1.0'),
            dtfProfitMargin: parseFloat(String(settingsMap.get('dtf_profit_margin')) || '2.0'),
            dtfRoundUpTo10: settingsMap.get('DTF_ROUND_UP_TO_10') !== 'false',
        };

        const companyInfoData: CompanyInfoData = (db.company_info.data).reduce((acc, c) => {
            const keyMap: Record<string, keyof CompanyInfoData> = {
                'COMPANY_NAME': 'companyName', 'COMPANY_ZIP': 'zip', 'COMPANY_ADDRESS': 'address',
                'COMPANY_TEL': 'tel', 'COMPANY_FAX': 'fax', 'BANK_NAME': 'bankName', 'BANK_BRANCH_NAME': 'bankBranchName',
                'BANK_ACCOUNT_TYPE': 'bankAccountType', 'BANK_ACCOUNT_NUMBER': 'bankAccountNumber',
                'BANK_ACCOUNT_HOLDER': 'bankAccountHolder', 'INVOICE_ISSUER_NUMBER': 'invoiceIssuerNumber',
            };
            const mappedKey = keyMap[c.key as string];
            if (mappedKey) { (acc as any)[mappedKey] = c.value; }
            return acc;
        }, {} as Partial<CompanyInfoData>) as CompanyInfoData;
        
        const dtfPrintSettings: DtfPrintSettings = {
            filmWidthMm: Number(settingsMap.get('dtf_film_width_mm')) || 280,
            logoMarginMm: Number(settingsMap.get('dtf_logo_margin_mm')) || 5,
            printSpeedMetersPerHour: Number(settingsMap.get('dtf_print_speed_m_per_h')) || 6,
            pressTimeMinutesPerItem: Number(settingsMap.get('dtf_press_time_minutes_per_item')) || 3,
            operatingHoursPerDay: Number(settingsMap.get('dtf_operating_hours_per_day')) || 8,
            operatingDaysPerMonth: Number(settingsMap.get('dtf_operating_days_per_month')) || 20,
        };
        
        const emptyTable = { schema: [], data: [] };

        return {
            products: productsByBrand,
            colors: colorsByManufacturer,
            sizes: sizesByManufacturer,
            stock: stock,
            tags: tags,
            categories: categories,
            pricing: pricingData,
            printLocations: db.print_locations.data.map(l => ({ locationId: l.locationId as string, groupName: l.groupName as string, label: l.label as string })),
            companyInfo: companyInfoData,
            partnerCodes: (db.partner_codes.data || []).map(p => ({
                code: p.code as string,
                partnerName: p.partnerName as string,
                description: p.description as string,
                rate: p.rate ? parseFloat(p.rate as string) : undefined
            })),
            prefectures: db.prefectures.data || [],
            customer_groups: db.customer_groups.data || [],
            additionalOptions: (db.additional_options?.data as AdditionalOption[]) || [],
            settings: db.settings as Table,
            color_settings: db.color_settings || emptyTable,
            layout_settings: db.layout_settings || emptyTable,
            behavior_settings: db.behavior_settings || emptyTable,
            pagination_settings: db.pagination_settings || emptyTable,
            
            // Safely access optional tables
            galleryImages: (db.gallery_images?.data as GalleryImage[]) || [],
            galleryTags: (db.gallery_tags?.data || []).map(t => ({ tagId: t.tagId as string, tagName: t.tagName as string })),
            pdf_templates: db.pdf_templates?.data || [],
            pdf_item_display_configs: db.pdf_item_display_configs || emptyTable,
            pdf_preview_zoom_configs: db.pdf_preview_zoom_configs || emptyTable,
            app_logs: db.app_logs || emptyTable,
            tool_migrations: db.tool_migrations || emptyTable,
            importer_mappings: db.importer_mappings || emptyTable,
            sql_export_presets: db.sql_export_presets || emptyTable,
            dev_roadmap: db.dev_roadmap || emptyTable,
            dev_constitution: db.dev_constitution || emptyTable,
            dev_guidelines_recommended: db.dev_guidelines_recommended || emptyTable,
            dev_guidelines_prohibited: db.dev_guidelines_prohibited || emptyTable,
            task_master: db.task_master || emptyTable,
            quote_tasks: db.quote_tasks || emptyTable,
            task_generation_rules: db.task_generation_rules || emptyTable,
            task_time_settings: db.task_time_settings || emptyTable,
            bills: db.bills || emptyTable,
            bill_items: db.bill_items || emptyTable,
            invoice_parsing_templates: db.invoice_parsing_templates || emptyTable,
            emails: db.emails || emptyTable,
            email_attachments: db.email_attachments || emptyTable,
            email_accounts: db.email_accounts || emptyTable,
            google_api_settings: db.google_api_settings || emptyTable,
            // DTF Data
            dtfConsumables: (db.dtf_consumables?.data as DtfConsumable[]) || [],
            dtfEquipment: (db.dtf_equipment?.data as DtfEquipment[]) || [],
            dtfLaborCosts: (db.dtf_labor_costs?.data as DtfLaborCost[]) || [],
            dtfPressTimeCosts: (db.dtf_press_time_costs?.data as DtfPressTimeCost[]) || [],
            dtfElectricityRates: (db.dtf_electricity_rates?.data as DtfElectricityRate[]) || [],
            dtfPrintSettings: dtfPrintSettings,
            dtfPrinters: (db.dtf_printers?.data as DtfPrinter[]) || [],
            dtfPrintSpeeds: (db.dtf_print_speeds?.data as DtfPrintSpeed[]) || [],
            posts: db.posts || emptyTable,
            post_categories: db.post_categories || emptyTable,
            post_tags: db.post_tags || emptyTable,
            post_tag_relations: db.post_tag_relations || emptyTable,
            work_sessions: db.work_sessions || emptyTable,
            work_session_quotes: db.work_session_quotes || emptyTable,
        };
    } catch (error) {
        console.error("Error transforming database to AppData:", String(error));
        return null;
    }
};

export default transformDatabaseToAppData;