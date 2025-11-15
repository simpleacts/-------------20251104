







import React, { useMemo, useState } from 'react';
import { Button, ArrowUturnLeftIcon, TrashIcon, Input, Select, Textarea } from '@components/atoms';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@components/organisms/Card';
import { Database, Row } from '@shared/types';
import { DicColor, InkManufacturer, InkProduct, InkRecipe, InkRecipeComponent, InkSeries, PantoneColor } from '../../types';

interface InkMixingToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

type MixingStyle = 'pigment_base' | 'color_mixing';
type ActiveView = 'new' | 'reuse';

interface EnrichedRecipe extends InkRecipe {
    components: InkRecipeComponent[];
    pantoneCode?: string;
    dicCode?: string;
    usages: {
        quoteCode?: string;
        customerName?: string;
        date: string;
    }[];
}

const ComponentRow: React.FC<{
    component: { ink_product_id: string; amount: number; };
    product: InkProduct;
    onUpdate: (productId: string, amount: number) => void;
    onRemove: (productId: string) => void;
    isIncremental: boolean;
    additions: number[];
    onAddAddition: (productId: string, value: number) => void;
    onResetAdditions: (productId: string) => void;
}> = ({ component, product, onUpdate, onRemove, isIncremental, additions, onAddAddition, onResetAdditions }) => {
    const [tempAmount, setTempAmount] = useState('');

    const handleAddAmount = () => {
        const newAmount = parseFloat(tempAmount);
        if (!isNaN(newAmount) && newAmount > 0) {
            onAddAddition(component.ink_product_id, newAmount);
            setTempAmount('');
        }
    };

    return (
        <div className="grid grid-cols-12 gap-2 items-center text-sm p-2 bg-base-100 dark:bg-base-dark-200 rounded">
            <div className="col-span-4 font-semibold">{product.color_name}</div>
            <div className="col-span-6 flex items-center gap-1 text-xs">
                {isIncremental ? (
                    <>
                        <Input type="number" value={tempAmount} onChange={(e) => setTempAmount(e.target.value)} className="w-16 h-7 text-right" placeholder="追加分" />
                        <Button variant="secondary" size="sm" onClick={handleAddAmount} className="h-7">+</Button>
                        <div className="flex-grow p-1 bg-white dark:bg-gray-700 rounded min-h-[28px]">{additions.join(' + ')}</div>
                        <Button variant="ghost" size="sm" onClick={() => onResetAdditions(component.ink_product_id)} title="リセット" className="h-7 p-1"><ArrowUturnLeftIcon className="w-4 h-4"/></Button>
                    </>
                ) : (
                    <Input type="number" value={component.amount || ''} onChange={(e) => onUpdate(component.ink_product_id, parseFloat(e.target.value) || 0)} className="w-24 h-7 text-right" placeholder="分量" />
                )}
            </div>
            <div className="col-span-1 text-right font-bold">{component.amount.toFixed(2)}g</div>
            <div className="col-span-1 text-right">
                <Button variant="ghost" size="sm" onClick={() => onRemove(component.ink_product_id)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
            </div>
        </div>
    );
};

const CalculatedComponentRow: React.FC<{ product: InkProduct; amount: number; totalInk: number }> = ({ product, amount, totalInk }) => {
    const percentage = totalInk > 0 ? (amount / totalInk) * 100 : 0;
    return (
        <div className="grid grid-cols-12 gap-2 items-center text-sm p-2">
            <div className="col-span-4 font-semibold">{product.color_name}</div>
            <div className="col-span-4 text-right font-mono">{percentage.toFixed(2)}%</div>
            <div className="col-span-4 text-right font-bold">{amount.toFixed(2)}g</div>
        </div>
    );
};

const InkMixingTool: React.FC<InkMixingToolProps> = ({ database, setDatabase }) => {
    const [activeView, setActiveView] = useState<ActiveView>('new');
    
    // Data from DB
    const manufacturers = useMemo(() => (database.ink_manufacturers?.data as InkManufacturer[]) || [], [database.ink_manufacturers]);
    const series = useMemo(() => (database.ink_series?.data as InkSeries[]) || [], [database.ink_series]);
    const products = useMemo(() => (database.ink_products?.data as InkProduct[]) || [], [database.ink_products]);
    const recipes = useMemo(() => (database.ink_recipes?.data as InkRecipe[]) || [], [database.ink_recipes]);
    const recipeComponents = useMemo(() => (database.ink_recipe_components?.data as InkRecipeComponent[]) || [], [database.ink_recipe_components]);
    const pantoneColors = useMemo(() => (database.pantone_colors?.data as PantoneColor[]) || [], [database.pantone_colors]);
    const dicColors = useMemo(() => (database.dic_colors?.data as DicColor[]) || [], [database.dic_colors]);

    // FIX: Add explicit type arguments to new Map() to resolve type inference issue.
    const productsMap = useMemo(() => new Map<string, InkProduct>(products.map(p => [p.id as string, p])), [products]);

    // New Recipe State
    const [category, setCategory] = useState<'水性' | '油性' | '溶剤' | ''>('');
    const [manufacturerId, setManufacturerId] = useState('');
    const [seriesId, setSeriesId] = useState('');
    const [newRecipeName, setNewRecipeName] = useState('');
    const [newRecipeNotes, setNewRecipeNotes] = useState('');
    const [newRecipePantoneId, setNewRecipePantoneId] = useState('');
    const [newRecipeDicId, setNewRecipeDicId] = useState('');
    const [components, setComponents] = useState<({ ink_product_id: string; amount: number; })[]>([]);
    const [additions, setAdditions] = useState<Record<string, number[]>>({});

    // Reuse Recipe State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState<EnrichedRecipe | null>(null);
    const [requiredAmount, setRequiredAmount] = useState<number | ''>('');

    const resetNewRecipeForm = () => {
        setCategory(''); setManufacturerId(''); setSeriesId(''); setNewRecipeName('');
        setNewRecipeNotes(''); setNewRecipePantoneId(''); setNewRecipeDicId('');
        setComponents([]); setAdditions({});
    };

    const enrichedRecipes = useMemo((): EnrichedRecipe[] => {
        // FIX: Add explicit type parameters to new Map() to resolve type inference issue.
        const pantoneMap = new Map<string, string>(pantoneColors.map(p => [p.id as string, p.code as string]));
        // FIX: Add explicit type parameters to new Map() to resolve type inference issue.
        const dicMap = new Map<string, string>(dicColors.map(d => [d.id as string, d.code as string]));
        const recipeUsageMap = (database.ink_recipe_usage?.data || []).reduce((acc, usage) => {
            if (!acc[usage.recipe_id as string]) acc[usage.recipe_id as string] = [];
            acc[usage.recipe_id as string].push(usage);
            return acc;
        }, {} as Record<string, Row[]>);
        // FIX: Add explicit type parameters to new Map() to resolve type inference issue.
        const quotesMap = new Map<string, Row>((database.quotes?.data || []).map(q => [q.id as string, q]));
        // FIX: Add explicit type parameters to new Map() to resolve type inference issue.
        const customersMap = new Map<string, Row>((database.customers?.data || []).map(c => [c.id as string, c]));

        return recipes.map(recipe => {
            const usages = (recipeUsageMap[recipe.id as string] || []).map(usage => {
                const quote = quotesMap.get(usage.quote_id as string);
                const customer = quote ? customersMap.get((quote as Row).customer_id as string) : null;
                return {
                    quoteCode: (quote as Row)?.quote_code as string || undefined,
                    customerName: (customer as Row)?.company_name as string || (customer as Row)?.name_kanji as string || undefined,
                    date: usage.used_at as string
                }
            });
            return {
                ...recipe,
                components: recipeComponents.filter(c => c.recipe_id === recipe.id),
                pantoneCode: recipe.pantone_id ? pantoneMap.get(recipe.pantone_id) : undefined,
                dicCode: recipe.dic_id ? dicMap.get(recipe.dic_id) : undefined,
                usages
            };
        });
    }, [recipes, recipeComponents, pantoneColors, dicColors, database]);

    const filteredRecipes = useMemo(() => {
        if (!searchTerm) return enrichedRecipes;
        const lowerSearch = searchTerm.toLowerCase();
        // FIX: Explicitly type the filter parameter `r` as EnrichedRecipe to resolve property access errors.
        return enrichedRecipes.filter((r: EnrichedRecipe) => 
            (r.name && r.name.toLowerCase().includes(lowerSearch)) ||
            (r.pantoneCode && r.pantoneCode.toLowerCase().includes(lowerSearch)) ||
            (r.dicCode && r.dicCode.toLowerCase().includes(lowerSearch)) ||
            (r.notes && r.notes.toLowerCase().includes(lowerSearch)) ||
            r.usages.some(u => 
                (u.quoteCode && u.quoteCode.toLowerCase().includes(lowerSearch)) ||
                (u.customerName && u.customerName.toLowerCase().includes(lowerSearch))
            )
        );
    }, [searchTerm, enrichedRecipes]);

    const calculatedComponents = useMemo(() => {
        if (!selectedRecipe || !requiredAmount) return [];
        const totalRecipeAmount = selectedRecipe.components.reduce((sum, c) => sum + c.amount, 0);
        if (totalRecipeAmount === 0) return [];
        const ratio = requiredAmount / totalRecipeAmount;
        return selectedRecipe.components.map(c => ({
            ...c,
            calculatedAmount: c.amount * ratio
        }));
    }, [selectedRecipe, requiredAmount]);
    
    const filteredManufacturers = useMemo(() => {
        if (!category) return manufacturers;
        const mfgIds = new Set(series.filter(s => s.category === category).map(s => s.manufacturer_id));
        return manufacturers.filter(m => mfgIds.has(m.id));
    }, [category, manufacturers, series]);

    const filteredSeries = useMemo(() => {
        if (!manufacturerId) return [];
        return series.filter(s => s.manufacturer_id === manufacturerId && (!category || s.category === category));
    }, [manufacturerId, series, category]);

    const { mixingStyle, availableComponents, availableBaseInks } = useMemo(() => {
        if (!seriesId) return { mixingStyle: null, availableComponents: [], availableBaseInks: [] };
        const selected = series.find(s => s.id === seriesId);
        const style = selected?.mixing_style || 'color_mixing';
        
        const productsInSeries = products.filter(p => p.series_id === seriesId);
        let components: InkProduct[] = [];
        let baseInks: InkProduct[] = [];

        if (style === 'pigment_base') {
            baseInks = productsInSeries.filter(p => p.product_type === 'base');
            components = productsInSeries.filter(p => p.product_type === 'pigment');
        } else {
            components = productsInSeries.filter(p => p.product_type === 'color');
        }

        return { mixingStyle: style, availableComponents: components, availableBaseInks: baseInks };
    }, [seriesId, products, series]);
    
    const handleSaveRecipe = () => {
        if (!newRecipeName.trim() || components.length === 0) {
            alert('レシピ名と最低1つのコンポーネントは必須です。');
            return;
        }

        const recipeId = `inkr_${Date.now()}`;
        const newRecipe: InkRecipe = {
            id: recipeId, name: newRecipeName, created_at: new Date().toISOString(),
            pantone_id: newRecipePantoneId || null, dic_id: newRecipeDicId || null, notes: newRecipeNotes,
        };

        const newComponents: InkRecipeComponent[] = components.map(c => ({
            id: `inkc_${Date.now()}_${c.ink_product_id}`, recipe_id: recipeId,
            ink_product_id: c.ink_product_id, amount: c.amount,
        }));

        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            newDb.ink_recipes.data.push(newRecipe);
            newDb.ink_recipe_components.data.push(...newComponents);
            return newDb;
        });
        
        alert('レシピを保存しました。');
        resetNewRecipeForm();
    };

    const handleComponentUpdate = (productId: string, amount: number) => {
        setComponents(cs => cs.map(c => c.ink_product_id === productId ? { ...c, amount } : c));
    };
    
    const handleAddAddition = (productId: string, value: number) => {
        setAdditions(prev => {
            const current = prev[productId] || [];
            return { ...prev, [productId]: [...current, value] };
        });
        setComponents(cs => cs.map(c => {
            if (c.ink_product_id === productId) {
                const current = additions[productId] || [];
                const newTotal = [...current, value].reduce((a,b) => a + b, 0);
                return { ...c, amount: newTotal };
            }
            return c;
        }));
    };
    
    const handleResetAdditions = (productId: string) => {
        setAdditions(prev => ({ ...prev, [productId]: [] }));
        setComponents(cs => cs.map(c => c.ink_product_id === productId ? { ...c, amount: 0 } : c));
    };

    const totalNewInkAmount = components.reduce((sum, c) => sum + c.amount, 0);

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6"><h1 className="text-3xl font-bold">インク配合管理</h1></header>
            <div className="border-b mb-4"><nav className="-mb-px flex space-x-4"><button onClick={() => setActiveView('new')} className={`py-2 px-1 border-b-2 text-sm ${activeView === 'new' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>新規作成</button><button onClick={() => setActiveView('reuse')} className={`py-2 px-1 border-b-2 text-sm ${activeView === 'reuse' ? 'border-brand-primary text-brand-primary' : 'border-transparent'}`}>登録済みから再利用</button></nav></div>

            {activeView === 'new' ? (
                <Card><CardHeader><CardTitle>新規インク配合</CardTitle></CardHeader><CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select value={category} onChange={e => { setCategory(e.target.value as any); setManufacturerId(''); setSeriesId(''); resetNewRecipeForm(); }}><option value="">カテゴリを選択...</option><option value="水性">水性</option><option value="油性">油性</option><option value="溶剤">溶剤</option></Select>
                        <Select value={manufacturerId} onChange={e => { setManufacturerId(e.target.value); setSeriesId(''); }} disabled={!category}><option value="">メーカーを選択...</option>{filteredManufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
                        <Select value={seriesId} onChange={e => setSeriesId(e.target.value)} disabled={!manufacturerId}><option value="">シリーズを選択...</option>{filteredSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                    </div>
                    {seriesId && (<div className="space-y-4 pt-4 border-t">
                        {mixingStyle === 'pigment_base' && (
                            <Select onChange={e => { const id = e.target.value; setComponents(cs => cs.some(c => c.ink_product_id === id) ? cs : [...cs, { ink_product_id: id, amount: 0 }])}}>
                                <option value="">ベースインクを追加...</option>
                                {availableBaseInks.map(p => <option key={p.id} value={p.id}>{p.color_name}</option>)}
                            </Select>
                        )}
                        <div><h4 className="font-semibold text-md mb-2">配合 ({totalNewInkAmount.toFixed(2)}g)</h4><div className="space-y-2">{components.map(c => <ComponentRow key={c.ink_product_id} component={c} product={productsMap.get(c.ink_product_id)!} onUpdate={handleComponentUpdate} onRemove={id => { setComponents(cs => cs.filter(c => c.ink_product_id !== id)); const newAdds = {...additions}; delete newAdds[id]; setAdditions(newAdds); }} isIncremental={mixingStyle==='pigment_base'} additions={additions[c.ink_product_id] || []} onAddAddition={handleAddAddition} onResetAdditions={handleResetAdditions} />)}</div>
                            <div className="flex items-center gap-2 mt-2">
                                <Select onChange={e => { const id = e.target.value; if(id) setComponents(cs => [...cs, { ink_product_id: id, amount: 0 }])}} value=""><option value="">{mixingStyle === 'pigment_base' ? '顔料' : 'インク'}を追加...</option>{availableComponents.filter(ac => !components.some(c => c.ink_product_id === ac.id)).map(p => <option key={p.id} value={p.id}>{p.color_name}</option>)}</Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            <Input value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} placeholder="レシピ名 (例: 特色レッド)"/>
                            <div className="grid grid-cols-2 gap-2"><Select value={newRecipePantoneId} onChange={e => {setNewRecipePantoneId(e.target.value); setNewRecipeDicId('');}}><option value="">PANTONE</option>{pantoneColors.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</Select><Select value={newRecipeDicId} onChange={e => {setNewRecipeDicId(e.target.value); setNewRecipePantoneId('');}}><option value="">DIC</option>{dicColors.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}</Select></div>
                            <Textarea value={newRecipeNotes} onChange={e => setNewRecipeNotes(e.target.value)} placeholder="備考" className="md:col-span-2"/>
                        </div>
                    </div>)}
                </CardContent><CardFooter><Button onClick={handleSaveRecipe} disabled={!seriesId}>登録</Button></CardFooter></Card>
            ) : (
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4"><Card><CardHeader><CardTitle>登録済みレシピ</CardTitle></CardHeader><CardContent>
                        <Input type="search" placeholder="レシピを検索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-4" />
                        <div className="space-y-2 max-h-96 overflow-y-auto">{filteredRecipes.map(r => <div key={r.id as string} onClick={() => setSelectedRecipe(r)} className={`p-2 rounded-md cursor-pointer ${selectedRecipe?.id === r.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                            <p className="font-semibold">{r.name}</p><p className="text-xs text-gray-500">{r.pantoneCode || r.dicCode}</p>
                        </div>)}</div>
                    </CardContent></Card></div>
                    <div className="col-span-8">{selectedRecipe && <Card><CardHeader><CardTitle>{selectedRecipe.name}</CardTitle></CardHeader><CardContent>
                        <div><label className="font-semibold text-sm">必要量 (g)</label><Input type="number" value={requiredAmount} onChange={e => setRequiredAmount(parseFloat(e.target.value) || '')} className="mt-1"/></div>
                        <div className="mt-4 border-t pt-4">
                            <h4 className="font-semibold mb-2">計算結果</h4>
                            <div className="space-y-1">{calculatedComponents.map(c => <CalculatedComponentRow key={c.ink_product_id} product={productsMap.get(c.ink_product_id)!} amount={c.calculatedAmount} totalInk={requiredAmount ? requiredAmount as number: 0} />)}</div>
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t"><p>合計</p><p>{(requiredAmount || 0).toFixed(2)}g</p></div>
                        </div>
                    </CardContent></Card>}</div>
                </div>
            )}
        </div>
    );
};

export default InkMixingTool;