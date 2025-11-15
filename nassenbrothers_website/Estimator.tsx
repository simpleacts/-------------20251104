import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PrintLocation, PrintDesign, CostDetails, OrderDetail, BrandColor, Product, Tag, 
    Category, PrintSize, SpecialInkType, SpecialInkDetail, CustomerInfo, AppData, SpecialInkOption,
    PrintLocationData, PlateType, PricingData, EstimatorState, PartnerCode, PrintSizeData
} from '../types';
import { calculateCost } from '../services/costService';

import { CostSummary } from './CostSummary';

interface EstimatorProps {
  appData: AppData;
  initialSearchQuery?: string;
  onNavigateHome: () => void;
  onNavigateToPrivacyPolicy: () => void;
  fromPage?: string | null;
}

const Section: React.FC<{ title: React.ReactNode; children: React.ReactNode, className?: string, titleAddon?: React.ReactNode }> = ({ title, children, className, titleAddon }) => (
  <div className={`bg-background-subtle p-6 border border-border-default ${className}`}>
    <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold text-text-heading" dangerouslySetInnerHTML={{ __html: title as string }}></div>
        {titleAddon}
    </div>
    {children}
  </div>
);

const toHalfWidth = (str: string): string => {
  if (!str) return '';
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
};

const katakanaToHiragana = (str: string): string => {
  if (!str) return '';
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const charCode = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(charCode);
  });
};

const sortOrderDetails = (
    details: OrderDetail[],
    allProducts: Product[],
    colorPalettes: Record<string, Record<string, BrandColor>>,
    sizeOrderMap: Map<string, number>
): OrderDetail[] => {
    
    const productMap = new Map<string, Product>(allProducts.map(p => [p.id, p]));

    const getColorCode = (item: OrderDetail): string => {
        const product = productMap.get(item.productId);
        if (!product) return '9999';
        const brand = product.brand;
        const palette = colorPalettes[brand];
        if (!palette) return '9999';
        const colorInfo = Object.values(palette).find(c => c.name === item.color);
        return colorInfo ? colorInfo.code : '9999';
    };

    return [...details].sort((a, b) => {
        const productA = productMap.get(a.productId);
        const productB = productMap.get(b.productId);

        const codeA = productA ? productA.code : 'zzzz';
        const codeB = productB ? productB.code : 'zzzz';
        
        const codeCompare = codeA.localeCompare(codeB);
        if (codeCompare !== 0) return codeCompare;

        const sizeOrderA = sizeOrderMap.get(a.size) || 99;
        const sizeOrderB = sizeOrderMap.get(b.size) || 99;
        const sizeCompare = sizeOrderA - sizeOrderB;
        if (sizeCompare !== 0) return sizeCompare;

        const colorCodeA = getColorCode(a);
        const colorCodeB = getColorCode(b);
        return colorCodeA.localeCompare(colorCodeB);
    });
};

const generateEstimateId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  return `E${year}${month}${day}-${hours}${minutes}${seconds}${milliseconds}`;
};

const generateTBDEstimateId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `TBD${year}${month}${day}-${hours}${minutes}${seconds}`;
};

// --- PrintDesignForm Component ---
interface PrintDesignFormProps {
  design: PrintDesign;
  specialInkOptions: SpecialInkOption[];
  availableLocations: PrintLocationData[];
  productsInOrder: Product[];
  pricingData: PricingData;
  isPrivilegedMode: boolean;
  printSizes: PrintSizeData[];
  existingDesigns: PrintDesign[];
  uiText: Record<string, string>;
  onSave: (design: PrintDesign) => void;
  onCancel: () => void;
}

const PrintDesignForm: React.FC<PrintDesignFormProps> = ({ design, specialInkOptions, availableLocations, productsInOrder, pricingData, isPrivilegedMode, printSizes, existingDesigns, uiText, onSave, onCancel }) => {
  const [localDesign, setLocalDesign] = useState<PrintDesign>(design);
  const [error, setError] = useState('');

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const locationGroups = useMemo(() => {
    return availableLocations.reduce((acc, loc) => {
      if (!acc[loc.groupName]) {
        acc[loc.groupName] = [];
      }
      acc[loc.groupName].push(loc);
      return acc;
    }, {} as Record<string, PrintLocationData[]>);
  }, [availableLocations]);

  const ALL_PRINT_SIZES = useMemo(() => printSizes.map(p => p.sizeId), [printSizes]);

  const availableSizes = useMemo(() => {
      if (isPrivilegedMode) return ALL_PRINT_SIZES;
      if (!pricingData) return ALL_PRINT_SIZES;

      let allowedSizeSets: PrintSize[][] = [];

      // 1. Constraint by selected location
      const locationConstraint = pricingData.printSizeConstraints.find(
          c => c.type === 'location' && c.id === localDesign.location
      );
      if (locationConstraint) {
          allowedSizeSets.push(locationConstraint.sizes);
      }

      // 2. Constraint by products in order
      if (productsInOrder.length > 0) {
          productsInOrder.forEach(product => {
              const productTagConstraints = pricingData.printSizeConstraints.filter(
                  c => c.type === 'tag' && product.tags.includes(c.id)
              );

              if (productTagConstraints.length > 0) {
                  const productSizes = productTagConstraints
                      .map(c => c.sizes)
                      .reduce((a, b) => a.filter(size => b.includes(size)));
                  allowedSizeSets.push(productSizes);
              }
          });
      }

      if (allowedSizeSets.length === 0) {
          return ALL_PRINT_SIZES;
      }
      
      return allowedSizeSets.reduce((a, b) => a.filter(size => b.includes(size)));
  }, [localDesign.location, productsInOrder, pricingData, isPrivilegedMode, ALL_PRINT_SIZES]);
  
  const handleFieldChange = (field: keyof PrintDesign, value: any) => {
    setLocalDesign(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
      if (localDesign.size && !availableSizes.includes(localDesign.size)) {
          handleFieldChange('size', availableSizes[0] || ALL_PRINT_SIZES[0]);
      }
  }, [availableSizes, localDesign.size, ALL_PRINT_SIZES]);


  const handleSpecialInkChange = (index: number, field: keyof SpecialInkDetail, value: any) => {
    const updatedInks = [...localDesign.specialInks];
    const inkToUpdate = { ...updatedInks[index] };
  
    if (field === 'count') {
      inkToUpdate.count = Math.max(1, parseInt(value, 10) || 1);
    } else {
      // @ts-ignore
      inkToUpdate[field] = value;
    }
    updatedInks[index] = inkToUpdate;
    setLocalDesign(prev => ({ ...prev, specialInks: updatedInks }));
  };

  const addSpecialInk = () => {
    const availableInkTypes = specialInkOptions
        .map(opt => opt.type)
        .filter(type => !localDesign.specialInks.some(si => si.type === type));

    if (availableInkTypes.length > 0) {
        const newInk: SpecialInkDetail = {
            type: availableInkTypes[0] as SpecialInkType,
            count: 1
        };
        handleFieldChange('specialInks', [...localDesign.specialInks, newInk]);
    }
  };

  const removeSpecialInk = (index: number) => {
    const updatedInks = localDesign.specialInks.filter((_, i) => i !== index);
    handleFieldChange('specialInks', updatedInks);
  };
  
  const validateAndSave = () => {
    if (!localDesign.location) {
        setError(uiText['printDesignForm.error.noLocation']);
        return;
    }
    if (localDesign.colors <= 0) {
        setError(uiText['printDesignForm.error.noColors']);
        return;
    }
    
    const isDuplicate = existingDesigns.some(d => {
      // When editing a design, don't compare it with itself.
      if (d.id === localDesign.id) {
        return false;
      }
      return d.location === localDesign.location && d.size === localDesign.size;
    });

    if (isDuplicate) {
      setError(uiText['printDesignForm.error.duplicate']);
      return;
    }

    const totalSpecialInkCount = localDesign.specialInks.reduce((sum, ink) => sum + ink.count, 0);
    if (totalSpecialInkCount > localDesign.colors) {
        setError(uiText['printDesignForm.error.inkCount']);
        return;
    }
    setError('');
    onSave(localDesign);
  };

  const totalSpecialInkCount = localDesign.specialInks.reduce((sum, ink) => sum + ink.count, 0);
  const availableInkTypesToAdd = specialInkOptions
    .map(opt => opt.type)
    .filter(type => !localDesign.specialInks.some(si => si.type === type));
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-surface shadow-2xl w-full max-w-lg animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-4 bg-background-subtle border-b flex-shrink-0">
                <h3 className="text-xl font-bold text-text-heading">{design.id.startsWith('new_') ? uiText['printDesignForm.title.new'] : uiText['printDesignForm.title.edit']}</h3>
            </header>
            
            <main className="p-6 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                    <h4 className="text-md font-semibold text-text-secondary border-b pb-2">{uiText['printDesignForm.section.basic']}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="design-location" className="block text-sm font-medium text-text-primary mb-1">{uiText['printDesignForm.location.label']}</label>
                            <select id="design-location" value={localDesign.location} onChange={(e) => handleFieldChange('location', e.target.value)} className="w-full p-2 border border-border-default focus:ring-secondary focus:border-secondary">
                                <option value="">{uiText['printDesignForm.location.placeholder']}</option>
                                {Object.entries(locationGroups).map(([groupName, locations]) => (
                                    <optgroup label={groupName} key={groupName}>
                                    {locations.map(loc => (
                                        <option key={loc.locationId} value={loc.locationId}>
                                        {loc.label}
                                        </option>
                                    ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="design-size" className="block text-sm font-medium text-text-primary mb-1">{uiText['printDesignForm.size.label']}</label>
                            <select id="design-size" value={localDesign.size} onChange={(e) => handleFieldChange('size', e.target.value)} className="w-full p-2 border border-border-default focus:ring-secondary focus:border-secondary">
                                {printSizes.map(sizeInfo => (
                                  <option key={sizeInfo.sizeId} value={sizeInfo.sizeId} disabled={!availableSizes.includes(sizeInfo.sizeId)}>
                                      {sizeInfo.label} {!availableSizes.includes(sizeInfo.sizeId) ? `(${uiText['printDesignForm.size.unavailable']})` : ''}
                                  </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="design-colors" className="block text-sm font-medium text-text-primary mb-1">{uiText['printDesignForm.colors.label']}</label>
                        <input id="design-colors" type="number" min="1" max="10" value={localDesign.colors} onChange={e => handleFieldChange('colors', Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-full p-2 border border-border-default focus:ring-secondary focus:border-secondary" />
                      </div>
                      <div>
                          <label htmlFor="design-plate-type" className="block text-sm font-medium text-text-primary mb-1">{uiText['printDesignForm.plateType.label']}</label>
                          <select id="design-plate-type" value={localDesign.plateType} onChange={(e) => handleFieldChange('plateType', e.target.value as PlateType)} className="w-full p-2 border border-border-default focus:ring-secondary focus:border-secondary">
                              <option value="normal">{uiText['printDesignForm.plateType.normal']}</option>
                              <option value="decomposition">{uiText['printDesignForm.plateType.decomposition']}</option>
                          </select>
                      </div>
                    </div>
                </div>

                <div className="space-y-4">
                     <h4 className="text-md font-semibold text-text-secondary border-b pb-2">{uiText['printDesignForm.section.options']}</h4>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">{uiText['printDesignForm.specialInk.label']?.replace('{{count}}', totalSpecialInkCount.toString()).replace('{{total}}', localDesign.colors.toString())}</label>
                        <div className="space-y-2 p-3 bg-background-subtle border">
                            {localDesign.specialInks.length === 0 ? (
                                <p className="text-xs text-text-secondary text-center">{uiText['printDesignForm.specialInk.empty']}</p>
                            ) : (
                                localDesign.specialInks.map((ink, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <select aria-label={uiText['printDesignForm.specialInk.type.ariaLabel']?.replace('{{index}}', (index + 1).toString())} value={ink.type} onChange={e => handleSpecialInkChange(index, 'type', e.target.value)} className="flex-grow p-1 border border-border-default text-sm">
                                            {specialInkOptions.map((opt) => (
                                                <option key={opt.type} value={opt.type}>{`${opt.displayName} (+¥${opt.cost})`}</option>
                                            ))}
                                        </select>
                                        <input aria-label={uiText['printDesignForm.specialInk.count.ariaLabel']?.replace('{{index}}', (index + 1).toString())} type="number" min="1" value={ink.count} onChange={e => handleSpecialInkChange(index, 'count', e.target.value)} className="w-16 p-1 border border-border-default text-sm" />
                                        <button aria-label={uiText['printDesignForm.specialInk.remove.ariaLabel']?.replace('{{index}}', (index + 1).toString())} onClick={() => removeSpecialInk(index)} className="text-text-secondary hover:text-accent p-1"><i className="fas fa-trash"></i></button>
                                    </div>
                                ))
                            )}
                             {availableInkTypesToAdd.length > 0 && (
                                <button onClick={addSpecialInk} className="w-full text-sm text-secondary hover:bg-secondary/10 p-2 transition-colors mt-2">
                                    <i className="fas fa-plus-circle mr-2"></i>{uiText['printDesignForm.specialInk.add']}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                {error && <p role="alert" className="text-sm text-accent bg-red-50 p-3 border border-red-200">{error}</p>}
            </main>
            
            <footer className="p-4 bg-background-subtle border-t flex justify-end gap-3 flex-shrink-0">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300">{uiText['common.cancel']}</button>
                <button onClick={validateAndSave} className="px-4 py-2 bg-primary text-white hover:bg-primary/90">{uiText['common.save']}</button>
            </footer>
        </div>
    </div>
  );
};

// --- ProductSelectionModal Component ---
interface ProductSelectionModalProps {
    products: Product[];
    tags: Tag[];
    categories: Category[];
    colorPalettes: Record<string, Record<string, BrandColor>>;
    sizeData: Record<string, Record<string, { name: string }>>;
    stockData: Record<string, number>;
    initialProductId?: string | null;
    allowedBrand: string | null;
    isPrivilegedMode: boolean;
    isPartnerMode: boolean;
    partnerInfo: { code: string; name: string; rate?: number; } | null;
    uiText: Record<string, string>;
    onAddItem: (item: OrderDetail) => void;
    onClose: () => void;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({ products, tags, categories, colorPalettes, sizeData, stockData, initialProductId, allowedBrand, isPrivilegedMode, isPartnerMode, partnerInfo, uiText, onAddItem, onClose }) => {
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    const [selectedBrand, setSelectedBrand] = useState<string>('');

    const [currentColor, setCurrentColor] = useState<string>('');
    const [currentSize, setCurrentSize] = useState<string>('');
    const [currentQuantity, setCurrentQuantity] = useState<number | string>(1);

    useEffect(() => {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }, []);

    const getFullProductName = useCallback((product?: Product): string => {
        if (!product) return '';
        const nameParts = [product.name, product.variantName].filter(Boolean);
        return nameParts.join(' ');
    }, []);

    const getDisplayString = useCallback((product?: Product): string => {
        if (!product) return '';
        return `${product.code} - ${getFullProductName(product)}`;
    }, [getFullProductName]);

    const handleSelectProduct = useCallback((product: Product) => {
        setSelectedProductId(product.id);
        setSearchQuery(getDisplayString(product));
        setIsSuggestionsVisible(false);
        setSelectedBrand(product.brand);
    }, [getDisplayString]);
    
    useEffect(() => {
        if (allowedBrand) {
            setSelectedBrand(allowedBrand);
        }
        const initialProduct = products.find(p => p.id === initialProductId);
        if (initialProduct) {
            handleSelectProduct(initialProduct);
        } else {
             setSearchQuery('');
        }
    }, [initialProductId, products, handleSelectProduct, allowedBrand]);

    const searchResults = useMemo(() => {
        if (!searchQuery || !isSuggestionsVisible) return [];
        const normalizedQuery = katakanaToHiragana(toHalfWidth(searchQuery).toLowerCase()).trim();
        if (!normalizedQuery) return [];
        const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
        const tagMap = tags.reduce((acc, tag) => { acc[tag.tagId] = katakanaToHiragana(tag.tagName.toLowerCase()); return acc; }, {} as Record<string, string>);
        const categoryMap = categories.reduce((acc, cat) => { acc[cat.categoryId] = katakanaToHiragana(cat.categoryName.toLowerCase()); return acc; }, {} as Record<string, string>);
        return products
            .filter(p => isPrivilegedMode || !allowedBrand || p.brand === allowedBrand)
            .filter(p => {
                return searchTerms.every(term => {
                    const fullProductName = katakanaToHiragana(getFullProductName(p).toLowerCase());
                    const code = p.code.toLowerCase();
                    const janCode = (p.jan_code || '').toLowerCase();
                    const productTagNames = p.tags.map(tagId => tagMap[tagId] || '').join(' ');
                    const productCategoryName = categoryMap[p.categoryId] || '';
                    const description = katakanaToHiragana((p.description || '').toLowerCase());
                    return fullProductName.includes(term) || code.includes(term) || janCode.includes(term) || productTagNames.includes(term) || productCategoryName.includes(term) || description.includes(term);
                });
            }).slice(0, 15);
    }, [searchQuery, products, tags, categories, isSuggestionsVisible, getFullProductName, allowedBrand, isPrivilegedMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) setIsSuggestionsVisible(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [selectedProductId, products]);
    const colorPalette = useMemo(() => selectedProduct ? colorPalettes[selectedProduct.brand] || {} : {}, [selectedProduct, colorPalettes]);
    const allProductColors = useMemo(() => {
        if (!selectedProduct) return [];
        const allColorsInPalette = Object.values(colorPalette);
        return selectedProduct.colors.map(colorCode => allColorsInPalette.find(color => color.code === colorCode)).filter((color): color is BrandColor => color !== undefined);
    }, [selectedProduct, colorPalette]);

    const brandSizes = useMemo(() => {
        if (!selectedProduct) return {};
        return sizeData[selectedProduct.brand] || {};
    }, [selectedProduct, sizeData]);

    const sizeNameToCodeMap = useMemo(() => {
        return Object.entries(brandSizes).reduce((acc, [code, data]) => {
            acc[data.name] = code;
            return acc;
        }, {} as Record<string, string>);
    }, [brandSizes]);

    const availableColors = useMemo(() => {
        if (!selectedProduct) return [];
        return allProductColors.map(color => {
            let isInStock = true;
            if (selectedProduct.brand === 'United Athle' || selectedProduct.brand === 'Print Star') {
                const colorType = color.type;
                const availableSizesForColor = selectedProduct.prices.filter(p => p.color === colorType).map(p => p.size);
                isInStock = availableSizesForColor.some(sizeName => {
                    const sizeCode = sizeNameToCodeMap[sizeName];
                    if (!sizeCode) return false;
                    const stockKey = `${selectedProduct.code}-${color.code}-${sizeCode}`;
                    return (stockData[stockKey] ?? 0) > 0;
                });
            }
            return { color, inStock: isInStock };
        });
    }, [selectedProduct, allProductColors, stockData, sizeNameToCodeMap]);

    const availableSizes = useMemo(() => {
        if (!selectedProduct) return [];
        const colorInfo = Object.values(colorPalette).find(c => c.name === currentColor);
        const colorType = colorInfo ? colorInfo.type : 'カラー';
        const sizesForColorType = selectedProduct.prices.filter(p => p.color === colorType).map(p => p.size);
        return sizesForColorType.map(sizeName => {
            let isInStock = true;
            if ((selectedProduct.brand === 'United Athle' || selectedProduct.brand === 'Print Star') && colorInfo) {
                const sizeCode = sizeNameToCodeMap[sizeName];
                isInStock = sizeCode ? (stockData[`${selectedProduct.code}-${colorInfo.code}-${sizeCode}`] ?? 0) > 0 : false;
            }
            return { size: sizeName, inStock: isInStock };
        });
    }, [selectedProduct, currentColor, colorPalette, stockData, sizeNameToCodeMap]);

    const isCurrentSelectionInStock = useMemo(() => availableSizes.find(s => s.size === currentSize)?.inStock ?? false, [currentSize, availableSizes]);

    useEffect(() => {
        if (!selectedProduct) return;
        setCurrentColor(availableColors.find(c => c.inStock)?.color?.name || '');
    }, [selectedProductId, availableColors, selectedProduct]);

    useEffect(() => {
        if (!selectedProduct) return;
        setCurrentSize(availableSizes.find(s => s.inStock)?.size || '');
    }, [currentColor, availableSizes, selectedProduct]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (!isSuggestionsVisible) setIsSuggestionsVisible(true);
    };

    const brands = useMemo(() => [...new Set(products.map(p => p.brand))], [products]);
    const productsForBrand = useMemo(() => {
        if (!selectedBrand) return [];
        const brandProducts = products.filter(p => p.brand === selectedBrand);
        return brandProducts.sort((a, b) => a.code.localeCompare(b.code));
    }, [selectedBrand, products]);

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBrand(e.target.value);
        setSelectedProductId('');
        setSearchQuery('');
    };

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value;
        if (!productId) {
            setSelectedProductId('');
            setSearchQuery('');
            return;
        }
        const product = products.find(p => p.id === productId);
        if (product) {
            handleSelectProduct(product);
        }
    };
    
    const handleClearSelection = useCallback(() => {
        setSelectedProductId('');
        setSearchQuery('');
        if (!allowedBrand) {
            setSelectedBrand('');
        }
        setCurrentColor('');
        setCurrentSize('');
        setCurrentQuantity(1);
    }, [allowedBrand]);

    const handleAddItemClick = useCallback(() => {
        if (!selectedProduct) return;
        const quantity = Number(currentQuantity);
        if (!currentSize || !quantity || quantity <= 0) { alert(uiText['productSelectionModal.error.invalidSelection']); return; }
        if (!isCurrentSelectionInStock) { alert(uiText['productSelectionModal.error.outOfStock']); return; }
        const colorInfo = Object.values(colorPalette).find(c => c.name === currentColor);
        if (!colorInfo) return;
        const priceInfo = selectedProduct.prices.find(p => p.color === colorInfo.type && p.size === currentSize);
        if (!priceInfo) return;
        
        const productNameWithCode = getDisplayString(selectedProduct);

        let unitPrice: number;
        if (isPartnerMode && partnerInfo && typeof partnerInfo.rate === 'number' && partnerInfo.rate > 0) {
            unitPrice = Math.round(priceInfo.listPrice * partnerInfo.rate);
        } else {
            unitPrice = priceInfo.price;
        }
        
        const newItem: OrderDetail = { 
            productId: selectedProduct.id, 
            productName: productNameWithCode, 
            color: currentColor, 
            size: currentSize, 
            quantity: quantity, 
            unitPrice: unitPrice 
        };
        onAddItem(newItem);
    }, [currentQuantity, currentSize, currentColor, selectedProduct, colorPalette, isCurrentSelectionInStock, getDisplayString, onAddItem, isPartnerMode, partnerInfo, uiText]);

    const hasSelectionToClear = useMemo(() => {
        return !!(searchQuery || selectedBrand || selectedProductId);
    }, [searchQuery, selectedBrand, selectedProductId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-surface shadow-2xl w-full max-w-3xl animate-fade-in-up flex flex-col" style={{maxHeight: '90vh'}}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-text-heading">{uiText['productSelectionModal.title']}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl">&times;</button>
                </header>
                
                <main className="p-6 space-y-4 overflow-y-auto">
                    {!isPrivilegedMode && allowedBrand && (
                        <div className="p-3 bg-blue-50 border-l-4 border-secondary text-sm text-blue-800">
                            {uiText['productSelectionModal.privilegedMode.info']?.replace('{{brand}}', allowedBrand)}
                        </div>
                    )}
                    <div ref={searchWrapperRef} className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="product-search" className="block text-sm font-medium text-text-primary">{uiText['productSelectionModal.search.label']}</label>
                            <button onClick={handleClearSelection} className="text-xs text-text-secondary hover:text-accent transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={!hasSelectionToClear}>
                                <i className="fas fa-times mr-1"></i>{uiText['productSelectionModal.clearSelection']}
                            </button>
                        </div>
                        <div className="relative">
                            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary z-10"></i>
                            <input id="product-search" type="text" value={searchQuery} onChange={handleSearchChange} onFocus={() => setIsSuggestionsVisible(true)} placeholder={uiText['productSelectionModal.search.placeholder']} className="w-full p-3 pl-12 border border-border-default focus:ring-secondary focus:border-secondary text-base" autoComplete="off" />
                        </div>
                        {isSuggestionsVisible && searchQuery && (
                            <div className="absolute z-30 w-full bg-surface border border-border-default mt-1 max-h-60 overflow-y-auto shadow-lg">
                                {searchResults.length > 0 ? (
                                    <ul>{searchResults.map(product => (<li key={product.id}><button type="button" onClick={() => handleSelectProduct(product)} className="w-full text-left px-4 py-3 cursor-pointer hover:bg-secondary/10"><p className="font-semibold text-text-heading">{getDisplayString(product)}</p><p className="text-sm text-text-secondary">{product.brand}</p></button></li>))}</ul>
                                ) : (<div className="px-4 py-3 text-text-secondary">{uiText['home.suggestions.notFound']}</div>)}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center"><span className="flex-grow bg-gray-200 h-px"></span><span className="mx-4 text-xs text-text-secondary">{uiText['common.or']}</span><span className="flex-grow bg-gray-200 h-px"></span></div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label htmlFor="brand-dropdown-modal" className="block text-sm font-medium text-text-primary mb-1">{uiText['productSelectionModal.brand.label']}</label>
                            <select id="brand-dropdown-modal" value={selectedBrand} onChange={handleBrandChange} className="w-full p-2 border border-border-default focus:ring-secondary focus:border-secondary">
                                <option value="">{uiText['productSelectionModal.brand.placeholder']}</option>
                                {brands.map(brand => (
                                    <option key={brand} value={brand} disabled={!isPrivilegedMode && !!allowedBrand && brand !== allowedBrand}>
                                        {brand} {!isPrivilegedMode && !!allowedBrand && brand !== allowedBrand ? `(${uiText['productSelectionModal.brand.unavailable']})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="product-dropdown-modal" className="block text-sm font-medium text-text-primary mb-1">{uiText['productSelectionModal.product.label']}</label>
                            <select id="product-dropdown-modal" value={selectedProductId} onChange={handleProductChange} className="w-full p-2 border border-border-default" disabled={!selectedBrand}>
                                <option value="">{uiText['productSelectionModal.product.placeholder']}</option>
                                {productsForBrand.map(p => (
                                    <option key={p.id} value={p.id}>{`${p.code} - ${getFullProductName(p)}`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    {selectedProduct && (
                        <>
                            <div className="mt-4"><p className="block text-sm font-medium text-text-primary mb-1">{uiText['productSelectionModal.selectedProduct.label']}</p><div className="w-full p-3 bg-background-subtle border border-border-default text-text-heading font-semibold">{[selectedProduct.code, selectedProduct.name, selectedProduct.variantName].filter(Boolean).join(' ')}</div></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
                                <div><label htmlFor="color-select-modal" className="block text-sm font-medium text-text-primary mb-1">{uiText['productSelectionModal.color.label']}</label><select id="color-select-modal" value={currentColor} onChange={e => setCurrentColor(e.target.value)} className="w-full p-2 border border-border-default">{availableColors.map(({ color, inStock }) => (<option key={color.name} value={color.name} disabled={!inStock}>{`${color.name} ${!inStock ? `(${uiText['productSelectionModal.color.outOfStock']})` : ''}`}</option>))}</select></div>
                                <div><label htmlFor="size-select-modal" className="block text-sm font-medium text-text-primary mb-1">{uiText['productSelectionModal.size.label']}</label><select id="size-select-modal" value={currentSize} onChange={e => setCurrentSize(e.target.value)} className="w-full p-2 border border-border-default" disabled={availableSizes.length === 0}>{availableSizes.map(({ size, inStock }) => (<option key={size} value={size} disabled={!inStock}>{`${size} ${!inStock ? `(${uiText['productSelectionModal.color.outOfStock']})` : ''}`}</option>))}</select></div>
                                <div><label htmlFor="quantity-input-modal" className="block text-sm font-medium text-text-primary mb-1">{uiText['productSelectionModal.quantity.label']}</label><input type="number" id="quantity-input-modal" min="1" value={currentQuantity} onChange={e => setCurrentQuantity(e.target.value)} className="w-full p-2 border border-border-default"/></div>
                            </div>
                        </>
                    )}
                </main>
                
                <footer className="p-4 border-t flex justify-end gap-3 bg-background-subtle">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-text-heading hover:bg-gray-300">{uiText['common.cancel']}</button>
                    <button onClick={handleAddItemClick} disabled={!currentSize || !currentColor || !isCurrentSelectionInStock} className="px-6 py-2 bg-primary text-white font-bold hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed">
                       <i className="fas fa-plus mr-2"></i>{uiText['productSelectionModal.addItemButton']}
                    </button>
                </footer>
            </div>
        </div>
    );
};

const EMPTY_CUSTOMER_INFO: CustomerInfo = {
  companyName: '',
  nameKanji: '',
  nameKana: '',
  email: '',
  phone: '',
  zipCode: '',
  address1: '',
  address2: '',
  notes: '',
  quoteSubject: '',
  hasSeparateShippingAddress: false,
  shippingName: '',
  shippingPhone: '',
  shippingZipCode: '',
  shippingAddress1: '',
  shippingAddress2: '',
};


// --- PartnerLoginModal Component ---
interface PartnerLoginModalProps {
  partnerCodes: PartnerCode[];
  uiText: Record<string, string>;
  onLogin: (partnerInfo: { code: string; name: string; rate?: number; }) => void;
  onClose: () => void;
}

const PartnerLoginModal: React.FC<PartnerLoginModalProps> = ({ partnerCodes, uiText, onLogin, onClose }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    setTimeout(() => {
      const partner = partnerCodes.find(p => p.code === code.trim());
      if (partner) {
        onLogin({ code: partner.code, name: partner.partnerName, rate: partner.rate });
      } else {
        setError(uiText['partnerLoginModal.error.invalidCode']);
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleLogin} className="bg-surface shadow-2xl w-full max-w-sm animate-fade-in-up">
        <header className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-text-heading">{uiText['partnerLoginModal.title']}</h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl" aria-label={uiText['common.close']}>&times;</button>
        </header>
        <main className="p-6 space-y-4">
          <p className="text-sm text-text-secondary">{uiText['partnerLoginModal.description']}</p>
          <div>
            <label htmlFor="partner-code" className="block text-sm font-medium text-text-primary mb-1">{uiText['partnerLoginModal.code.label']}</label>
            <input 
              ref={inputRef}
              type="text" 
              id="partner-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              className="w-full p-2 border border-border-default focus:ring-secondary focus:border-secondary font-mono"
            />
          </div>
          {error && <p className="text-sm text-accent bg-red-50 p-2 border border-red-200" role="alert">{error}</p>}
        </main>
        <footer className="p-4 bg-background-subtle border-t flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-text-heading hover:bg-gray-300">
            {uiText['common.cancel']}
          </button>
          <button 
            type="submit" 
            disabled={isLoading}
            className="px-6 py-2 bg-primary text-white font-bold hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-wait w-32 flex items-center justify-center"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : uiText['partnerLoginModal.submitButton']}
          </button>
        </footer>
      </form>
    </div>
  );
};


// --- Main Estimator Component ---
export const Estimator: React.FC<EstimatorProps> = ({ appData, initialSearchQuery = '', onNavigateHome, onNavigateToPrivacyPolicy, fromPage }) => {
  const { products, tags, categories, colors, sizes, stock, pricing, printLocations, companyInfo, partnerCodes, printSizes, sizeOrder, uiText } = appData;
  const allProducts = useMemo(() => Object.values(products).flat(), [products]);
  const navigate = useNavigate();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [printDesigns, setPrintDesigns] = useState<PrintDesign[]>([]);
  const [cost, setCost] = useState<CostDetails>({ totalCost: 0, tax: 0, totalCostWithTax: 0, costPerShirt: 0, tshirtCost: 0, setupCost: 0, printCost: 0, shippingCost: 0, printCostDetail: { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 }, setupCostDetail: {} });

  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [tempOrderDetails, setTempOrderDetails] = useState<OrderDetail[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [isDesignFormVisible, setIsDesignFormVisible] = useState(false);
  const [editingDesign, setEditingDesign] = useState<PrintDesign | null>(null);

  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [initialModalProductId, setInitialModalProductId] = useState<string | null>(null);
  
  const [estimateId, setEstimateId] = useState('');

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(EMPTY_CUSTOMER_INFO);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPartnerMode, setIsPartnerMode] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{ code: string; name: string; rate?: number; } | null>(null);
  const [isPartnerLoginModalVisible, setIsPartnerLoginModalVisible] = useState(false);
  
  const [overridePrintQuantity, setOverridePrintQuantity] = useState<number | ''>('');
  const [isBringInMode, setIsBringInMode] = useState(false);
  const [adminModeNotification, setAdminModeNotification] = useState('');

  const [isReorder, setIsReorder] = useState(false);
  const [originalEstimateId, setOriginalEstimateId] = useState<string | null>(null);
  
  const [showRestoreNotification, setShowRestoreNotification] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const [isGeneratingProvisionalPdf, setIsGeneratingProvisionalPdf] = useState(false);
  const [mailSendStatus, setMailSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [mailSendError, setMailSendError] = useState('');


  const isPrivilegedMode = isAdminMode || isPartnerMode;

  const sizeOrderMap = useMemo(() => {
    return new Map(sizeOrder.map(item => [item.sizeName, item.sortOrder]));
  }, [sizeOrder]);

  // Secret code to toggle admin mode
  useEffect(() => {
    let keySequence = '';
    const secret = 'admin';

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses if an input or textarea is focused
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        keySequence = '';
        return;
      }

      keySequence += e.key;
      if (!secret.startsWith(keySequence)) {
        keySequence = e.key === secret[0] ? e.key : '';
      }
      
      if (keySequence === secret) {
        setIsAdminMode(prev => {
          const newMode = !prev;
          setAdminModeNotification(newMode ? uiText['estimator.notification.adminEnabled'] : uiText['estimator.notification.adminDisabled']);
          setTimeout(() => setAdminModeNotification(''), 3000);
          return newMode;
        });
        keySequence = ''; // Reset
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [uiText]);

  useEffect(() => {
    if (isInitialized) return;

    try {
      const savedStateJSON = localStorage.getItem('estimatorState');
      if (savedStateJSON) {
        const savedState: EstimatorState & { customerInfo: CustomerInfo & { isDeliveryAddress?: boolean } } = JSON.parse(savedStateJSON);
        if (savedState.orderDetails) setOrderDetails(savedState.orderDetails);
        if (savedState.printDesigns) setPrintDesigns(savedState.printDesigns);
        if (savedState.customerInfo) {
            const loadedCustomerInfo = { ...EMPTY_CUSTOMER_INFO, ...savedState.customerInfo };
            if (typeof savedState.customerInfo.isDeliveryAddress !== 'undefined') {
                loadedCustomerInfo.hasSeparateShippingAddress = !savedState.customerInfo.isDeliveryAddress;
                delete (loadedCustomerInfo as any).isDeliveryAddress;
            }
            setCustomerInfo(loadedCustomerInfo);
        }
        if (savedState.isAdminMode) setIsAdminMode(savedState.isAdminMode);
        if (savedState.isPartnerMode) setIsPartnerMode(savedState.isPartnerMode);
        if (savedState.partnerInfo) setPartnerInfo(savedState.partnerInfo);
        if (savedState.isBringInMode) setIsBringInMode(savedState.isBringInMode);
        
        if (savedState.isReorder) {
            setIsReorder(true);
            setOriginalEstimateId(savedState.originalEstimateId || savedState.estimateId);
            setEstimateId(generateEstimateId());
        } else {
            setIsReorder(false);
            setOriginalEstimateId(null);
            if (savedState.estimateId) {
              setEstimateId(savedState.estimateId);
            } else {
              setEstimateId(generateEstimateId());
            }
        }
        setShowRestoreNotification(true);
        setTimeout(() => setShowRestoreNotification(false), 4000);
      } else {
        setEstimateId(generateEstimateId());
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      localStorage.removeItem('estimatorState');
      setEstimateId(generateEstimateId());
    }

    if (initialSearchQuery) {
      const productToSelect = allProducts.find(p => `${p.code} - ${p.name} ${p.variantName || ''}`.trim() === initialSearchQuery);
      if (productToSelect) {
        setInitialModalProductId(productToSelect.id);
        setIsProductModalVisible(true);
      }
    }

    setIsInitialized(true);

  }, [isInitialized, allProducts, initialSearchQuery]);


  useEffect(() => {
    if (!isInitialized) return;

    try {
      const stateToSave: Partial<EstimatorState> = {
        orderDetails,
        printDesigns,
        customerInfo,
        estimateId,
        isAdminMode,
        isPartnerMode,
        partnerInfo,
        isBringInMode,
        isReorder,
        originalEstimateId: originalEstimateId,
      };
      localStorage.setItem('estimatorState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  }, [orderDetails, printDesigns, customerInfo, estimateId, isAdminMode, isPartnerMode, partnerInfo, isBringInMode, isInitialized, isReorder, originalEstimateId]);

  useEffect(() => {
    if (!isInitialized || !customerInfo.email || !estimateId || orderDetails.length === 0) {
        setSaveStatus('idle');
        return;
    }

    setSaveStatus('saving');
    const handler = setTimeout(async () => {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            setSaveStatus('error');
        }
    }, 1500);

    return () => clearTimeout(handler);
  }, [orderDetails, printDesigns, customerInfo, estimateId, isInitialized]);

  const getPrintLocationGroup = useCallback((locationId: string): string => {
    return printLocations.find(loc => loc.locationId === locationId)?.groupName || '';
  }, [printLocations]);

  const getPrintLocationLabel = useCallback((locationId: string): string => {
    return printLocations.find(loc => loc.locationId === locationId)?.label || '';
  }, [printLocations]);

  const handleAddItem = useCallback((newItem: OrderDetail) => {
    setOrderDetails(prevDetails => {
      const existingIndex = prevDetails.findIndex(item => item.productId === newItem.productId && item.color === newItem.color && item.size === newItem.size);
      let updatedDetails;
      if (existingIndex !== -1) {
        updatedDetails = [...prevDetails];
        updatedDetails[existingIndex].quantity += newItem.quantity;
      } else {
        updatedDetails = [...prevDetails, newItem];
      }
      return sortOrderDetails(updatedDetails, allProducts, colors, sizeOrderMap);
    });
    setIsProductModalVisible(false);
  }, [allProducts, colors, sizeOrderMap]);

  const handleRemoveItem = useCallback((indexToRemove: number) => {
    setOrderDetails(prevDetails => prevDetails.filter((_, index) => index !== indexToRemove));
  }, []);
  
  const handleStartEdit = () => { setTempOrderDetails([...orderDetails]); setIsEditingOrder(true); };
  const handleConfirmEdit = () => { 
    setOrderDetails(sortOrderDetails(tempOrderDetails, allProducts, colors, sizeOrderMap)); 
    setIsEditingOrder(false); 
  };
  const handleCancelEdit = () => setIsEditingOrder(false);
  const handleTempQuantityChange = (indexToUpdate: number, newQuantity: number) => {
    const quantity = Math.max(1, newQuantity || 1);
    setTempOrderDetails(prevDetails => prevDetails.map((item, index) => index === indexToUpdate ? { ...item, quantity } : item));
  };

  const totalQuantity = useMemo(() => orderDetails.reduce((sum, item) => sum + item.quantity, 0), [orderDetails]);

  const handleAddNewDesign = () => {
    setEditingDesign({ id: `new_${Date.now()}`, location: '', size: '30x40', colors: 1, specialInks: [], plateType: 'normal' });
    setIsDesignFormVisible(true);
  };
  const handleEditDesign = (designToEdit: PrintDesign) => {
    setEditingDesign(JSON.parse(JSON.stringify(designToEdit)));
    setIsDesignFormVisible(true);
  };
  const handleDeleteDesign = (designId: string) => setPrintDesigns(designs => designs.filter(d => d.id !== designId));
  const handleSaveDesign = (designToSave: PrintDesign) => {
    if (designToSave.id.startsWith('new_')) {
      const newDesign = { ...designToSave, id: `design_${Date.now()}` };
      setPrintDesigns(prevDesigns => [...prevDesigns, newDesign]);
    } else {
      setPrintDesigns(prevDesigns => 
        prevDesigns.map(d => (d.id === designToSave.id ? designToSave : d))
      );
    }
    setIsDesignFormVisible(false);
    setEditingDesign(null);
  };
  
  const handleOpenBlankProductModal = () => {
    setInitialModalProductId(null);
    setIsProductModalVisible(true);
  };

  const handleReset = useCallback(() => {
    if (window.confirm(uiText['estimator.reset.confirm'])) {
      setOrderDetails([]);
      setPrintDesigns([]);
      setCustomerInfo(EMPTY_CUSTOMER_INFO);
      setIsAdminMode(false);
      setIsPartnerMode(false);
      setPartnerInfo(null);
      setOverridePrintQuantity('');
      setIsBringInMode(false);
      setIsReorder(false);
      setOriginalEstimateId(null);
      localStorage.removeItem('estimatorState');
      setEstimateId(generateEstimateId());
      window.scrollTo(0, 0);
    }
  }, [uiText]);

  useEffect(() => {
    const newCost = calculateCost(
      { items: orderDetails, printDesigns }, 
      allProducts, 
      customerInfo, 
      pricing,
      colors,
      { isAdminMode, isPartnerMode, overridePrintQuantity: Number(overridePrintQuantity) || undefined, isReorder, isBringInMode }
    );
    setCost(newCost);
  }, [orderDetails, printDesigns, allProducts, customerInfo, pricing, colors, isAdminMode, isPartnerMode, overridePrintQuantity, isReorder, isBringInMode]);
  
  const handlePartnerLogin = (pInfo: { code: string; name: string; rate?: number; }) => {
    setIsPartnerMode(true);
    setPartnerInfo(pInfo);
    setIsPartnerLoginModalVisible(false);
  };

  const handlePartnerLogout = () => {
    setIsPartnerMode(false);
    setPartnerInfo(null);
  };

  const SaveStatusIndicator = () => {
    switch (saveStatus) {
        case 'saving':
            return <div className="text-xs text-text-secondary flex items-center"><div className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin mr-2"></div>{uiText['estimator.saveStatus.saving']}</div>;
        case 'saved':
            return <div className="text-xs text-green-600 flex items-center"><i className="fas fa-check-circle mr-2"></i>{uiText['estimator.saveStatus.saved']}</div>;
        case 'error':
            return <div className="text-xs text-accent flex items-center"><i className="fas fa-exclamation-triangle mr-2"></i>{uiText['estimator.saveStatus.error']}</div>;
        default:
            return <div className="text-xs text-text-secondary">{uiText['estimator.saveStatus.idle']}</div>;
    }
  };

  const availableLocationsForNewDesign = useMemo(() => {
      if (isPrivilegedMode) return printLocations;
      if (orderDetails.length === 0) {
          return printLocations;
      }
      const categoryIdsInOrder = [...new Set(orderDetails.map(item => {
          return allProducts.find(p => p.id === item.productId)?.categoryId;
      }).filter((id): id is string => !!id))];
  
      if (categoryIdsInOrder.length === 0) {
          return printLocations;
      }
  
      const allowedLocationIds = new Set<string>();
      categoryIdsInOrder.forEach(catId => {
          const locationsForCat = pricing.categoryPrintLocations[catId];
          if (locationsForCat) {
              locationsForCat.forEach(locId => allowedLocationIds.add(locId));
          }
      });
  
      if (allowedLocationIds.size === 0) {
          const hasDefinedRestrictions = categoryIdsInOrder.some(catId => pricing.categoryPrintLocations[catId]);
          return hasDefinedRestrictions ? [] : printLocations;
      }
      
      return printLocations.filter(loc => allowedLocationIds.has(loc.locationId));
  }, [orderDetails, allProducts, printLocations, pricing.categoryPrintLocations, isPrivilegedMode]);

  const productsInOrder = useMemo(() => {
    const productIds = [...new Set(orderDetails.map(item => item.productId))];
    return productIds.map(id => allProducts.find(p => p.id === id)).filter((p): p is Product => !!p);
  }, [orderDetails, allProducts]);
  
  const brandsInOrder = useMemo(() => {
      return [...new Set(orderDetails.map(item => {
          return allProducts.find(p => p.id === item.productId)?.brand;
      }).filter((brand): brand is string => !!brand))];
  }, [orderDetails, allProducts]);
  
  const allowedBrand = !isPrivilegedMode && brandsInOrder.length > 0 ? brandsInOrder[0] : null;

  const listToDisplay = isEditingOrder ? tempOrderDetails : orderDetails;

  const handleDirectPdfDownload = async (isProvisional: boolean) => {
    const setIsLoading = isProvisional ? setIsGeneratingProvisionalPdf : () => {};
    setIsLoading(true);

    const id = isProvisional ? generateTBDEstimateId() : estimateId;
    const docType = 'estimate';

    const payload = {
      documentType: docType,
      orderDetails,
      printDesigns,
      cost,
      totalQuantity,
      customerInfo,
      products: allProducts,
      colorPalettes: colors,
      estimateId: id,
      pricingData: pricing,
      printLocations,
      companyInfo,
      isBringInMode,
      paymentDueDate: null, // Not an invoice
    };

    try {
      const response = await fetch('/api/generate_pdf.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = 'PDFの生成に失敗しました。';
        if (response.headers.get('Content-Type')?.includes('application/json')) {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.error || errorMsg;
        } else {
            errorMsg = `サーバーエラーが発生しました (HTTP ${response.status})。`;
        }
        throw new Error(errorMsg);
      }
      
      const blob = await response.blob();
      if (blob.type !== 'application/pdf') {
        throw new Error('サーバーから無効なファイル形式が返されました。');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const docTitle = '御見積書';
      a.download = `【${docTitle}${isProvisional ? '(デザインデータ未確認)' : ''}】${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert(error instanceof Error ? error.message : "PDFの生成に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: any) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAndSendMail = async () => {
    if (!customerInfo.email) {
        setMailSendError(uiText['estimator.saveAndSend.error.missingEmail']);
        setMailSendStatus('error');
        return;
    }
    if (!customerInfo.quoteSubject) {
        setMailSendError(uiText['estimator.saveAndSend.error.missingSubject']);
        setMailSendStatus('error');
        return;
    }
    setMailSendStatus('sending');
    setMailSendError('');
    
    try {
        const payload = {
            type: 'estimate',
            email: customerInfo.email,
            data: {
                estimateId,
                orderDetails,
                printDesigns,
                cost,
                totalQuantity,
                customerInfo,
                companyInfo,
            }
        };

        const response = await fetch('/api/save_quote.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '見積もりの保存に失敗しました。');
        }
        
        setMailSendStatus('success');

    } catch (error) {
        setMailSendStatus('error');
        setMailSendError(error instanceof Error ? error.message : '不明なエラーが発生しました。');
    } finally {
        setTimeout(() => {
            setMailSendStatus('idle');
        }, 3000);
    }
  };

  const handleNavigateToMyPage = () => {
    navigate('/my-page');
  };

  return (
    <>
      {showRestoreNotification && (
          <div className="fixed top-20 right-4 bg-green-600 text-white px-6 py-3 shadow-lg z-50 animate-fade-in-up" role="alert">
              <i className="fas fa-check-circle mr-2"></i>
              {uiText['estimator.notification.restored']}
          </div>
      )}
      {adminModeNotification && (
        <div className="fixed top-20 right-4 bg-blue-600 text-white px-6 py-3 shadow-lg z-50 animate-fade-in-up" role="alert">
          <i className="fas fa-info-circle mr-2"></i>
          {adminModeNotification}
        </div>
      )}
      {isPartnerLoginModalVisible && (
        <PartnerLoginModal 
          partnerCodes={partnerCodes}
          uiText={uiText}
          onLogin={handlePartnerLogin}
          onClose={() => setIsPartnerLoginModalVisible(false)}
        />
      )}
      <main className="w-full max-w-screen-2xl mx-auto px-4 pt-16 pb-8">
        {fromPage === 'myPage' && (
          <div className="mb-6">
            <button
              onClick={handleNavigateToMyPage}
              className="text-secondary hover:text-secondary/80 font-semibold transition-colors flex items-center"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              {uiText['estimator.backToMyPage']}
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 lg:sticky lg:top-24 self-start">
            <CostSummary 
              totalCost={cost.totalCost}
              shippingCost={cost.shippingCost}
              tax={cost.tax}
              totalCostWithTax={cost.totalCostWithTax}
              costPerShirt={cost.costPerShirt} 
              quantity={totalQuantity}
              tshirtCost={cost.tshirtCost}
              setupCost={cost.setupCost}
              printCost={cost.printCost}
              printDesigns={printDesigns}
              costDetails={cost}
              printLocations={printLocations}
              isBringInMode={isBringInMode}
              uiText={uiText}
            />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <SaveStatusIndicator />
                <button
                    onClick={handleReset}
                    className="text-sm font-semibold text-accent hover:text-accent/80 bg-red-100 hover:bg-red-200 px-4 py-2 flex items-center transition-colors"
                    title={uiText['estimator.reset.ariaLabel']}
                >
                    <i className="fas fa-undo mr-2"></i>
                    {uiText['estimator.reset.button']}
                </button>
                
            </div>
            {isPartnerMode && partnerInfo && (
              <div className="p-3 bg-secondary text-white flex justify-between items-center" role="alert">
                  <p className="font-bold"><i className="fas fa-user-check mr-2"></i>{uiText['estimator.partner.welcome']?.replace('{{name}}', partnerInfo.name)}</p>
                  <button onClick={handlePartnerLogout} className="text-sm bg-white/20 hover:bg-white/40 px-3 py-1">
                      {uiText['estimator.partner.logout']}
                  </button>
              </div>
            )}
            {isReorder && (
              <div className="p-4 bg-blue-50 border-l-4 border-secondary text-blue-800" role="alert">
                  <p className="font-bold">{uiText['estimator.reorder.title']}</p>
                  <p className="text-sm">
                      {uiText['estimator.reorder.description']?.replace('{{id}}', originalEstimateId || '')}
                  </p>
              </div>
            )}
            {/* --- 1. Order List --- */}
            <Section title={uiText['estimator.title.section1']}>
              {isAdminMode && (
                <div className="p-3 bg-green-50 border-l-4 border-green-400 text-sm text-green-800 mb-4 space-y-2">
                    <div className="font-bold"><i className="fas fa-unlock-alt mr-2"></i>{uiText['estimator.admin.title']}</div>
                    <div className="flex items-center">
                      <input
                          id="bring-in-mode"
                          type="checkbox"
                          checked={isBringInMode}
                          onChange={(e) => setIsBringInMode(e.target.checked)}
                          className="h-4 w-4 text-secondary focus:ring-secondary border-border-default"
                      />
                      <label htmlFor="bring-in-mode" className="ml-2 block text-sm text-text-primary">
                          {uiText['estimator.admin.bringInMode']}
                      </label>
                    </div>
                </div>
              )}
              <div className="mt-2">
                <div className="text-md font-semibold text-text-secondary mb-3 border-b border-border-default pb-2 flex justify-between items-center">
                  <h3>{uiText['estimator.totalItemsHeader']?.replace('{{count}}', totalQuantity.toString())}</h3>
                  {orderDetails.length > 0 && (isEditingOrder ? (<div className="space-x-2"><button onClick={handleConfirmEdit} className="text-sm font-normal text-white bg-primary hover:bg-primary/90 px-3 py-1"><i className="fas fa-check mr-2"></i>{uiText['estimator.editButton.done']}</button><button onClick={handleCancelEdit} className="text-sm font-normal text-text-primary bg-gray-200 hover:bg-gray-300 px-3 py-1">{uiText['estimator.editButton.cancel']}</button></div>) : (<button onClick={handleStartEdit} className="text-sm font-normal text-secondary hover:text-secondary/80 bg-blue-100 hover:bg-blue-200 px-3 py-1"><i className="fas fa-pen mr-2"></i>{uiText['estimator.editButton.label']}</button>))}
                </div>
                {orderDetails.length === 0 ? (<div className="text-center py-6 bg-surface border"><p className="text-text-secondary">{uiText['estimator.emptyOrderList.message']}</p></div>) : (
                  <>
                    <div className="md:hidden">{listToDisplay.map((item, index) => (<div key={`${index}-mobile`} className="bg-surface border p-4 mb-3"><div className="flex justify-between items-start pb-3 border-b mb-3"><h4 className="font-semibold text-text-heading mr-4 flex-grow">{item.productName}</h4><button onClick={() => handleRemoveItem(index)} className="text-gray-400 hover:text-accent disabled:text-gray-300 text-xl p-1 -mt-2 -mr-2" disabled={isEditingOrder}><i className="fas fa-times"></i></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm"><div className="space-y-2"><div className="flex justify-between"><span className="text-text-secondary">色/サイズ</span><span className="font-medium">{item.color}/{item.size}</span></div><div className="flex justify-between"><span className="text-text-secondary">単価</span><span className="font-medium">¥{item.unitPrice.toLocaleString()}</span></div></div><div className="space-y-2"><div className="flex justify-between items-center"><span className="text-text-secondary">枚数</span>{isEditingOrder ? <input type="number" value={item.quantity} onChange={(e) => handleTempQuantityChange(index, parseInt(e.target.value, 10))} min="1" className="w-24 p-1 text-right border"/> : <span className="font-medium">{item.quantity.toLocaleString()}</span>}</div><div className="flex justify-between"><span className="text-text-secondary">小計</span><span className="text-secondary font-bold">¥{(item.unitPrice*item.quantity).toLocaleString()}</span></div></div></div></div>))}</div>
                    <div className="hidden md:block"><div className="flex items-center text-sm font-semibold text-text-secondary bg-surface p-3 border-b"><div className="w-12"></div><div className="flex-grow">品名</div><div className="w-32">色/サイズ</div><div className="w-20 text-center">枚数</div><div className="w-20 text-right">単価</div><div className="w-24 text-right">小計</div></div><div className="border border-t-0 bg-surface">{listToDisplay.map((item, index) => (<div key={`${index}-desktop`} className="flex items-center p-3 border-b last:border-b-0"><div className="w-12 flex justify-center"><button onClick={() => handleRemoveItem(index)} className="text-gray-400 hover:text-accent disabled:text-gray-300" disabled={isEditingOrder}><i className="fas fa-times"></i></button></div><div className="flex-grow font-semibold pr-4">{item.productName}</div><div className="w-32 text-sm">{item.color}/{item.size}</div><div className="w-20 text-center">{isEditingOrder ? <input type="number" value={item.quantity} onChange={(e) => handleTempQuantityChange(index, parseInt(e.target.value,10))} min="1" className="w-16 p-1 text-center border" /> : <span>{item.quantity.toLocaleString()}</span>}</div><div className="w-20 text-right text-sm">¥{item.unitPrice.toLocaleString()}</div><div className="w-24 text-right font-semibold text-secondary">¥{(item.unitPrice*item.quantity).toLocaleString()}</div></div>))}</div></div>
                  </>
                  )}
              </div>
              
                <button onClick={handleOpenBlankProductModal} className="w-full mt-4 bg-primary text-white font-bold py-3 px-4 hover:bg-primary/90 transition-colors">
                    <i className="fas fa-plus mr-2"></i>{uiText['estimator.addItemButton.label']}
                </button>
              
            </Section>

            <Section title={uiText['estimator.title.section2']}>
                {isAdminMode && (
                    <div className="mb-4">
                        <label htmlFor="override-quantity" className="block text-sm font-medium text-text-primary mb-1">{uiText['estimator.admin.overrideQuantity.label']}</label>
                        <input
                            id="override-quantity"
                            type="number"
                            value={overridePrintQuantity}
                            onChange={(e) => setOverridePrintQuantity(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
                            className="w-full p-2 border border-border-default"
                            placeholder={uiText['estimator.admin.overrideQuantity.placeholder']}
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            {uiText['estimator.admin.overrideQuantity.description']}
                        </p>
                    </div>
                )}
                {printDesigns.length === 0 ? (
                    <div className="text-center py-6 bg-surface border">
                        <p className="text-text-secondary">{uiText['estimator.emptyDesignList.message']}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {printDesigns.map((design, index) => {
                            const groupName = getPrintLocationGroup(design.location || '');
                            const locationLabel = getPrintLocationLabel(design.location || '');
                            const specialInkDisplay = design.specialInks.map(si => {
                                const opt = pricing.specialInkOptions.find(o => o.type === si.type);
                                return `${opt ? opt.displayName : si.type} x${si.count}`;
                            }).join(', ');
                            const plateTypeLabel = design.plateType === 'decomposition' ? uiText['printDesignForm.plateType.decomposition'] : uiText['printDesignForm.plateType.normal'];
                            const printSizeLabel = printSizes.find(p => p.sizeId === design.size)?.label || design.size;

                            return (
                                <div key={design.id} className="bg-surface border p-3 flex items-center justify-between">
                                    <div className="flex-grow">
                                        <p className="font-bold text-text-heading">{uiText['costSummary.details.setupCostDesign']?.replace('{{index}}', (index + 1).toString()).replace('{{group}}', groupName).replace('{{label}}', locationLabel).split('(')[0]}</p>
                                        <p className="text-sm text-text-secondary">
                                            {printSizeLabel} | {design.colors}色 | {plateTypeLabel}
                                            {design.specialInks.length > 0 && ` | 特殊インク: ${specialInkDisplay}`}
                                        </p>
                                    </div>
                                    {!isReorder && (
                                      <div className="flex items-center gap-2">
                                          <button onClick={() => handleEditDesign(design)} className="text-secondary hover:text-secondary/80 p-2"><i className="fas fa-pen"></i></button>
                                          <button onClick={() => handleDeleteDesign(design.id)} className="text-accent hover:text-accent/80 p-2"><i className="fas fa-trash"></i></button>
                                      </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {!isReorder && (
                  <button onClick={handleAddNewDesign} className="w-full mt-4 bg-primary text-white font-bold py-3 px-4 hover:bg-primary/90 transition-colors">
                      <i className="fas fa-plus mr-2"></i>{uiText['estimator.addDesignButton.label']}
                  </button>
                )}
            </Section>
            
            <Section title={uiText['estimator.title.section3']}>
              <p className="text-sm text-text-secondary mb-4">
                {uiText['estimator.provisionalPdf.description']}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => handleDirectPdfDownload(true)}
                    disabled={isGeneratingProvisionalPdf}
                    className="flex-1 bg-accent text-white font-bold py-3 px-4 hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isGeneratingProvisionalPdf ? (
                        <><div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div><span>{uiText['estimator.provisionalPdf.button.loading']}</span></>
                    ) : (
                        <><i className="fas fa-file-pdf mr-2"></i>{uiText['estimator.provisionalPdf.button.label']}</>
                    )}
                  </button>
              </div>
            </Section>
            
            <Section title={uiText['estimator.title.section4']}>
              <p className="text-sm text-text-secondary mb-4">
                {uiText['estimator.saveAndSend.description']}
              </p>
              <div className="space-y-4">
                <div>
                    <label htmlFor="quote-subject" className="block text-sm font-medium text-text-primary mb-1" dangerouslySetInnerHTML={{ __html: uiText['estimator.saveAndSend.subject.label'] }}></label>
                    <input
                      id="quote-subject"
                      type="text"
                      placeholder={uiText['estimator.saveAndSend.subject.placeholder']}
                      value={customerInfo.quoteSubject}
                      onChange={(e) => handleCustomerInfoChange('quoteSubject', e.target.value)}
                      className="w-full p-3 border border-border-default focus:ring-secondary focus:border-secondary"
                      required
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                  <div className="flex-grow w-full">
                    <label htmlFor="save-email" className="block text-sm font-medium text-text-primary mb-1" dangerouslySetInnerHTML={{ __html: uiText['estimator.saveAndSend.email.label'] }}></label>
                    <input
                      id="save-email"
                      type="email"
                      placeholder={uiText['estimator.saveAndSend.email.placeholder']}
                      value={customerInfo.email}
                      onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                      className="w-full p-3 border border-border-default focus:ring-secondary focus:border-secondary"
                      required
                    />
                  </div>
                  <button
                    onClick={handleSaveAndSendMail}
                    disabled={mailSendStatus === 'sending' || !customerInfo.email || !customerInfo.quoteSubject}
                    className="w-full sm:w-auto bg-secondary text-white font-bold py-3 px-6 hover:bg-secondary/90 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {mailSendStatus === 'sending' ? (
                      <><div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div><span>{uiText['estimator.saveAndSend.button.loading']}</span></>
                    ) : (
                      <><i className="fas fa-envelope mr-2"></i>{uiText['estimator.saveAndSend.button.label']}</>
                    )}
                  </button>
                </div>
              </div>
              {mailSendStatus === 'success' && (
                <p className="text-sm text-green-600 mt-2">
                  <i className="fas fa-check-circle mr-1"></i>
                  {uiText['estimator.saveAndSend.success']}
                </p>
              )}
              {mailSendStatus === 'error' && (
                <p className="text-sm text-accent mt-2">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  {mailSendError}
                </p>
              )}
            </Section>

            {isDesignFormVisible && editingDesign && (
                <PrintDesignForm 
                    design={editingDesign}
                    specialInkOptions={pricing.specialInkOptions}
                    availableLocations={availableLocationsForNewDesign}
                    productsInOrder={productsInOrder}
                    pricingData={pricing}
                    isPrivilegedMode={isPrivilegedMode}
                    printSizes={printSizes}
                    existingDesigns={printDesigns}
                    uiText={uiText}
                    onSave={handleSaveDesign}
                    onCancel={() => setIsDesignFormVisible(false)}
                />
            )}

            {isProductModalVisible && (
                <ProductSelectionModal
                    products={allProducts}
                    tags={tags}
                    categories={categories}
                    colorPalettes={colors}
                    sizeData={sizes}
                    stockData={stock}
                    initialProductId={initialModalProductId}
                    allowedBrand={allowedBrand}
                    isPrivilegedMode={isPrivilegedMode}
                    isPartnerMode={isPartnerMode}
                    partnerInfo={partnerInfo}
                    uiText={uiText}
                    onAddItem={handleAddItem}
                    onClose={() => setIsProductModalVisible(false)}
                />
            )}
            
          </div>
        </div>
      </main>

    </>
  );
};