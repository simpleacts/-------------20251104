import { AppData, Product, BrandColor, ProductPrice, Tag, Category, GalleryImage, GalleryTag, PrintLocationData, CompanyInfoData, PartnerCode, PricingData, PrintSize, SpecialInkType, PrintLocation, SpecialInkOption, PrintSizeConstraint, Menu, PrintSizeData, SizeOrder, CustomerInfo, Article, ArticleTag, PageData } from '../types';

// --- LIVE MODE: Fetches data from PHP backend ---
const fetchFromApi = async (): Promise<AppData> => {
    try {
        // Use a cache-busting query parameter to ensure fresh data in dev mode
        const response = await fetch('/api/app-data.php?cachebust=' + new Date().getTime());

        if (!response.ok) {
            let errorMessage = `サーバーエラーが発生しました (HTTP ${response.status})。`;
            try {
                const errorData = await response.json();
                errorMessage = errorData?.details || errorData?.error || errorMessage;
            } catch (e) {
                // Ignore if the response is not JSON
            }
            throw new Error(errorMessage);
        }

        const appData: AppData = await response.json();
        return appData;

    } catch (error) {
        console.error("Failed to load app data from the server", error);
        throw new Error(error instanceof Error ? error.message : 'サーバーからのデータ取得中に不明なエラーが発生しました。');
    }
};

// --- MOCK MODE: Fetches data from local CSV files ---
const fetchFromCsv = async (): Promise<AppData> => {
    // This function contains the original logic from apiService.ts.csv.txt
    
    // Generic CSV parser
    const parseCsv = <T extends object>(csvText: string): T[] => {
      const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
      if (lines.length < 2) return [];

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/; 

      return lines.slice(1)
        .map(line => {
          if (!line.trim()) return null;

          const values = line.split(regex);
          
          return headers.reduce((obj, header, index) => {
            let value = values[index] ? values[index].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            // @ts-ignore
            obj[header] = value;
            return obj;
          }, {} as T);
        })
        .filter((item): item is T => item !== null);
    };

    const parseKeyValueCsv = (csvText: string): Record<string, string> => {
        const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
        if (lines.length < 2) return {};
        return lines.slice(1).reduce((acc, line) => {
            const parts = line.split(/,(.*)/s);
            if (parts.length >= 2) {
                const key = parts[0].trim().replace(/"/g, '');
                let value = parts[1].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                  value = value.substring(1, value.length - 1).replace(/""/g, '"');
                }
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, string>);
    };
    
    try {
        const [
            tagsCsv, categoriesCsv, galleryTagsCsv, galleryImagesCsv, printLocationsCsv, companyInfoCsv, partnerCodesCsv, menusCsv,
            brandSellingPriceRatesCsv, plateCostsCsv, specialInkCostsCsv, additionalPrintCostsBySizeCsv,
            additionalPrintCostsByLocationCsv, additionalPrintCostsByTagCsv, printPricingTiersCsv, shippingCostsCsv,
            settingsCsv, printCostCombinationCsv, plateCostCombinationCsv, categoryPrintLocationsCsv, printSizeConstraintsCsv,
            productsMasterCsv, productDetailsCsv,
            productPricesUaCsv, productPricesPsCsv,
            colorsUaCsv, colorsPsCsv,
            sizesUaCsv, sizesPsCsv,
            stockUaCsv, stockPsCsv,
            printSizesCsv, sizeOrderCsv,
            themeSettingsCsv, uiTextCsv,
            customersCsv,
            articlesCsv, articleTagsCsv,
            pagesContentJson,
        ] = await Promise.all([
            fetch('/templates/tags.csv').then(res => res.text()),
            fetch('/templates/categories.csv').then(res => res.text()),
            fetch('/templates/gallery_tags.csv').then(res => res.text()),
            fetch('/templates/gallery_images.csv').then(res => res.text()),
            fetch('/templates/print_locations.csv').then(res => res.text()),
            fetch('/templates/company_info.csv').then(res => res.text()),
            fetch('/templates/partner_codes.csv').then(res => res.text()),
            fetch('/templates/menus.csv').then(res => res.text()),
            fetch('/templates/brand_selling_price_rates.csv').then(res => res.text()),
            fetch('/templates/plate_costs.csv').then(res => res.text()),
            fetch('/templates/special_ink_costs.csv').then(res => res.text()),
            fetch('/templates/additional_print_costs_by_size.csv').then(res => res.text()),
            fetch('/templates/additional_print_costs_by_location.csv').then(res => res.text()),
            fetch('/templates/additional_print_costs_by_tag.csv').then(res => res.text()),
            fetch('/templates/print_pricing_tiers.csv').then(res => res.text()),
            fetch('/templates/shipping_costs.csv').then(res => res.text()),
            fetch('/templates/settings.csv').then(res => res.text()),
            fetch('/templates/print_cost_combination.csv').then(res => res.text()),
            fetch('/templates/plate_cost_combination.csv').then(res => res.text()),
            fetch('/templates/category_print_locations.csv').then(res => res.text()),
            fetch('/templates/print_size_constraints.csv').then(res => res.text()),
            fetch('/templates/products_master.csv').then(res => res.text()),
            fetch('/templates/product_details.csv').then(res => res.text()),
            fetch('/templates/product_prices_united_athle.csv').then(res => res.text()),
            fetch('/templates/product_prices_print_star.csv').then(res => res.text()),
            fetch('/templates/colors_united_athle.csv').then(res => res.text()),
            fetch('/templates/colors_print_star.csv').then(res => res.text()),
            fetch('/templates/sizes_united_athle.csv').then(res => res.text()),
            fetch('/templates/sizes_print_star.csv').then(res => res.text()),
            fetch('/templates/stock_united_athle.csv').then(res => res.text()),
            fetch('/templates/stock_print_star.csv').then(res => res.text()),
            fetch('/templates/print_sizes.csv').then(res => res.text()),
            fetch('/templates/size_order.csv').then(res => res.text()),
            fetch('/templates/theme_settings.csv').then(res => res.text()),
            fetch('/templates/ui_text.csv').then(res => res.text()),
            fetch('/templates/customers.csv').then(res => res.text()),
            fetch('/templates/articles.csv').then(res => res.text()),
            fetch('/templates/article_tags.csv').then(res => res.text()),
            fetch('/templates/pages_content.json').then(res => res.json()),
        ]);

        // --- Parsing logic remains the same ---
        const tags: Tag[] = parseCsv(tagsCsv);
        const categories: Category[] = parseCsv<{ categoryId: string; categoryName: string; icon?: string; sort_order?: string }>(categoriesCsv).map(c => ({
            ...c,
            sort_order: c.sort_order ? parseInt(c.sort_order, 10) : undefined
        }));
        const galleryTags: GalleryTag[] = parseCsv(galleryTagsCsv);
        const printLocations: PrintLocationData[] = parseCsv(printLocationsCsv);
        const partnerCodes: PartnerCode[] = parseCsv<{ code: string; partnerName: string; description: string; rate?: string; }>(partnerCodesCsv).map(p => ({ ...p, rate: p.rate ? parseFloat(p.rate) : undefined }));
        const menus: Menu[] = parseCsv<{ id: string; name: string; path: string; parent_id: string; sort_order: string; icon?: string }>(menusCsv).map(m => ({
            id: parseInt(m.id, 10),
            name: m.name,
            path: m.path,
            parent_id: m.parent_id ? parseInt(m.parent_id, 10) : null,
            sort_order: parseInt(m.sort_order, 10),
            icon: m.icon || undefined
        }));
        const printSizes: PrintSizeData[] = parseCsv<{ sizeId: PrintSize, label: string }>(printSizesCsv);
        const sizeOrder: SizeOrder[] = parseCsv<{ sizeName: string, sortOrder: string }>(sizeOrderCsv).map(s => ({...s, sortOrder: parseInt(s.sortOrder, 10) }));
        const galleryImages: GalleryImage[] = parseCsv<{ id: string; title: string; description: string; tags: string; imageCount: string; is_published: string }>(galleryImagesCsv).map(img => ({
            ...img,
            tags: img.tags.split(',').filter(Boolean),
            imageCount: parseInt(img.imageCount, 10) || 1,
            is_published: img.is_published === '1',
        }));
        const articles: Article[] = parseCsv<{ id: string; slug: string; title: string; excerpt: string; content: string; tags: string; published_date: string; image_path: string; is_published: string }>(articlesCsv).map(art => ({
            ...art,
            tags: art.tags.split(',').map(t => t.trim()).filter(Boolean),
            is_published: art.is_published === '1',
        }));
        const articleTags: ArticleTag[] = parseCsv(articleTagsCsv);
        const companyInfoData = parseKeyValueCsv(companyInfoCsv);
        const companyInfo: CompanyInfoData = {
            companyName: companyInfoData.COMPANY_NAME || '', zip: companyInfoData.COMPANY_ZIP || '', address: companyInfoData.COMPANY_ADDRESS || '',
            tel: companyInfoData.COMPANY_TEL || '', fax: companyInfoData.COMPANY_FAX || '', bankName: companyInfoData.BANK_NAME || '',
            bankBranchName: companyInfoData.BANK_BRANCH_NAME || '', bankAccountType: companyInfoData.BANK_ACCOUNT_TYPE || '',
            bankAccountNumber: companyInfoData.BANK_ACCOUNT_NUMBER || '', bankAccountHolder: companyInfoData.BANK_ACCOUNT_HOLDER || '',
            invoiceIssuerNumber: companyInfoData.INVOICE_ISSUER_NUMBER || ''
        };
        const customers: CustomerInfo[] = parseCsv<{id: string; companyName: string; nameKanji: string; nameKana: string; email: string; phone: string; zipCode: string; address1: string; address2: string; hasSeparateShippingAddress: string; shippingName: string; shippingPhone: string; shippingZipCode: string; shippingAddress1: string; shippingAddress2: string;}>(customersCsv).map(c => ({
            ...c,
            notes: '',
            quoteSubject: '',
            hasSeparateShippingAddress: c.hasSeparateShippingAddress.toLowerCase() === 'true',
        }));
        const theme = parseKeyValueCsv(themeSettingsCsv);
        const uiText = parseKeyValueCsv(uiTextCsv);
        const settings = parseKeyValueCsv(settingsCsv);
        const plateCostsData = parseCsv<{ size: PrintSize; plateType: string; cost: string; surchargePerColor: string }>(plateCostsCsv);
        const plateCosts: PricingData['plateCosts'] = plateCostsData.reduce((acc, pc) => {
            acc[`${pc.size}-${pc.plateType}`] = { cost: parseInt(pc.cost, 10), surchargePerColor: parseInt(pc.surchargePerColor, 10) };
            return acc;
        }, {} as Record<string, { cost: number; surchargePerColor: number; }>);
        const specialInkOptions: SpecialInkOption[] = parseCsv<{ type: SpecialInkType; cost: string; displayName: string; }>(specialInkCostsCsv).map(si => ({ ...si, cost: parseInt(si.cost, 10) }));
        const specialInkCosts: Record<SpecialInkType, number> = specialInkOptions.reduce((acc, si) => { acc[si.type] = si.cost; return acc; }, {} as Record<SpecialInkType, number>);
        const shippingCostsData = parseCsv<{ region: string; cost: string; prefectures: string }>(shippingCostsCsv);
        const shippingCosts: PricingData['shippingCosts'] = shippingCostsData.reduce((acc, sc) => {
            acc[sc.region] = { cost: parseInt(sc.cost, 10), prefectures: sc.prefectures.split(',').filter(Boolean) };
            return acc;
        }, {} as Record<string, { cost: number; prefectures: string[]; }>);
        const printCostCombinationData = parseCsv<{ combination_id: string; category_id: string }>(printCostCombinationCsv);
        const plateCostCombinationData = parseCsv<{ combination_id: string; category_id: string }>(plateCostCombinationCsv);
        const categoryPrintLocationsData = parseCsv<{ category_id: string; allowed_location_ids: string }>(categoryPrintLocationsCsv);
        const printSizeConstraintsData = parseCsv<{ constraint_type: 'tag' | 'location'; constraint_id: string; allowed_print_sizes: string }>(printSizeConstraintsCsv);
        const pricing: PricingData = {
            brandSellingPriceRates: parseCsv<{ brand: string; rate: string }>(brandSellingPriceRatesCsv).reduce((acc, b) => { acc[b.brand] = parseFloat(b.rate); return acc; }, {} as Record<string, number>),
            plateCosts,
            specialInkOptions,
            specialInkCosts,
            additionalPrintCostsBySize: parseCsv<{ size: PrintSize; cost: string }>(additionalPrintCostsBySizeCsv).reduce((acc, item) => { acc[item.size] = parseInt(item.cost, 10); return acc; }, {} as Partial<Record<PrintSize, number>>),
            additionalPrintCostsByLocation: parseCsv<{ location: PrintLocation; cost: string }>(additionalPrintCostsByLocationCsv).reduce((acc, item) => { acc[item.location] = parseInt(item.cost, 10); return acc; }, {} as Partial<Record<PrintLocation, number>>),
            additionalPrintCostsByTag: parseCsv<{ tagId: string; cost: string }>(additionalPrintCostsByTagCsv).reduce((acc, item) => { acc[item.tagId] = parseInt(item.cost, 10); return acc; }, {} as Record<string, number>),
            printPricingTiers: parseCsv<{ min: string; max: string; firstColor: string; additionalColor: string }>(printPricingTiersCsv).map(t => ({ min: parseInt(t.min, 10), max: parseInt(t.max, 10), firstColor: parseInt(t.firstColor, 10), additionalColor: parseInt(t.additionalColor, 10) })),
            shippingCosts,
            shippingFreeThreshold: parseInt(settings.SHIPPING_FREE_THRESHOLD, 10) || 50000,
            bringInFeeRate: parseFloat(settings.BRING_IN_FEE_RATE) || 0.05,
            printCostCategoryCombinations: printCostCombinationData.reduce((acc, item) => { acc[item.category_id] = item.combination_id; return acc; }, {} as Record<string, string>),
            plateCostCategoryCombinations: plateCostCombinationData.reduce((acc, item) => { acc[item.category_id] = item.combination_id; return acc; }, {} as Record<string, string>),
            categoryPrintLocations: categoryPrintLocationsData.reduce((acc, item) => { acc[item.category_id] = item.allowed_location_ids.split(',').filter(Boolean); return acc; }, {} as Record<string, string[]>),
            printSizeConstraints: printSizeConstraintsData.map(c => ({ type: c.constraint_type, id: c.constraint_id, sizes: c.allowed_print_sizes.split(',') as PrintSize[] }))
        };
        const colorsData = [...parseCsv<any>(colorsUaCsv), ...parseCsv<any>(colorsPsCsv)];
        const sizesData = [...parseCsv<any>(sizesUaCsv), ...parseCsv<any>(sizesPsCsv)];
        const stockDataRaw = [...parseCsv<any>(stockUaCsv), ...parseCsv<any>(stockPsCsv)];
        const productPricesRaw = [...parseCsv<any>(productPricesUaCsv), ...parseCsv<any>(productPricesPsCsv)];
        const productDetailsRaw = parseCsv<{ product_id: string; name: string; variantName: string; description: string }>(productDetailsCsv);
        const productsMasterRaw = parseCsv<{ id: string; brand: string; code: string; colors: string; tags: string; categoryId: string; jan_code: string; generalImageCount: string; is_published: string; }>(productsMasterCsv);
        const products: Record<string, Product[]> = {};
        const colors: Record<string, Record<string, BrandColor>> = {};
        const sizes: Record<string, Record<string, { name: string }>> = {};
        const stock: Record<string, number> = {};
        colorsData.forEach(c => { if (!colors[c.brand]) colors[c.brand] = {}; colors[c.brand][c.code] = { code: c.code, name: c.name, hex: c.hex, type: c.colorType }; });
        sizesData.forEach(s => { if (!sizes[s.brand]) sizes[s.brand] = {}; sizes[s.brand][s.sizeCode] = { name: s.sizeName }; });
        stockDataRaw.forEach(s => { stock[`${s.productCode}-${s.colorCode}-${s.sizeCode}`] = parseInt(s.stockQuantity, 10); });
        const brandRates = pricing.brandSellingPriceRates;
        const productPrices = productPricesRaw.map(p => {
            const listPrice = parseInt(p.listPrice, 10);
            const product = productsMasterRaw.find(m => m.id === p.productId);
            const rate = product ? brandRates[product.brand] ?? brandRates['DEFAULT'] : brandRates['DEFAULT'];
            const price = Math.round(listPrice * rate / 10) * 10;
            return { productId: p.productId, color: p.colorType as 'ホワイト' | 'カラー', size: p.size, listPrice: listPrice, purchasePrice: parseInt(p.purchasePrice, 10), price: price } as ProductPrice & { productId: string };
        });
        productsMasterRaw.filter(p => p.is_published === '1').forEach(p => {
            const details = productDetailsRaw.find(d => d.product_id === p.id);
            const product: Product = { id: p.id, brand: p.brand, name: details?.name || '', variantName: details?.variantName || '', description: details?.description || '', code: p.code, jan_code: p.jan_code, colors: p.colors.split(',').filter(Boolean), tags: p.tags.split(',').filter(Boolean), categoryId: p.categoryId, generalImageCount: parseInt(p.generalImageCount, 10) || 0, prices: productPrices.filter(price => price.productId === p.id) };
            if (!products[p.brand]) products[p.brand] = [];
            products[p.brand].push(product);
        });

        const appData: AppData = {
            products, colors, sizes, stock, tags, categories, galleryImages, galleryTags, articles, articleTags, pricing, printLocations, companyInfo, partnerCodes, menus, printSizes, sizeOrder, theme, uiText, customers, pagesContent: pagesContentJson,
        };

        return appData;

    } catch (error) {
        console.error("Failed to load app data from CSV files", error);
        throw new Error(error instanceof Error ? error.message : 'CSVファイルの読み込み中に不明なエラーが発生しました。');
    }
};

/**
 * Dynamically determines whether to fetch data from the live API or local mock CSVs
 * based on the 'devMode' value in localStorage. Defaults to 'mock'.
 */
export const fetchData = async (): Promise<AppData> => {
    const devMode = localStorage.getItem('devMode');

    if (devMode === 'live') {
        console.log('Running in LIVE mode.');
        return fetchFromApi();
    } else {
        console.log('Running in MOCK mode (default).');
        return fetchFromCsv();
    }
};
