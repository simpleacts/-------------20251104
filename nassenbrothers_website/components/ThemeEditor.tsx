import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { colord } from 'colord';

interface ThemeEditorProps {
    isLocked: boolean;
}

type ThemeItem = {
    key: string;
    value: string;
    isHeader: boolean;
};

const LockedOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
        <i className="fas fa-lock text-4xl text-gray-500 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-700">機能はロックされています</h3>
        <p className="text-gray-600">この機能の編集は現在ロックされています。</p>
        <p className="text-sm text-gray-500 mt-2">ロックを解除するには、開発ツールに移動してください。</p>
    </div>
);

// --- Helper Functions ---
const parseCssValue = (value: string): { number: number; unit: string } => {
    const match = value.match(/(-?\d*\.?\d+)(\D*)/);
    return {
        number: match ? parseFloat(match[1]) : 0,
        unit: match ? match[2] || 'px' : 'px',
    };
};

const parseShadowValue = (value: string) => {
    const defaultShadow = { x: '0', y: '0', blur: '0', spread: '0', color: '#000000', opacity: 0 };
    if (!value || value === 'none') return defaultShadow;
    const colorMatch = value.match(/(rgba?\(.*\)|#\w+)/);
    const color = colorMatch ? colorMatch[0] : 'rgba(0,0,0,0)';
    const c = colord(color);

    const parts = value.replace(color, '').trim().split(' ').map(p => p.trim());
    return {
        x: parts[0] || '0',
        y: parts[1] || '0',
        blur: parts[2] || '0',
        spread: parts[3] || '0',
        color: c.toHex(),
        opacity: c.alpha(),
    };
};

const parseBorderValue = (value: string) => {
    const parts = value.split(' ');
    return {
        width: parseCssValue(parts[0] || '1px').number,
        unit: parseCssValue(parts[0] || '1px').unit,
        style: parts[1] || 'solid',
        color: parts.slice(2).join(' ') || '#000000',
    };
};

const googleFonts = [
    { name: 'システムフォント', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif" },
    { name: 'Noto Sans JP', value: "'Noto Sans JP', sans-serif" },
    { name: 'Roboto', value: "'Roboto', sans-serif" },
    { name: 'Lato', value: "'Lato', sans-serif" },
    { name: 'Oswald', value: "'Oswald', sans-serif" },
    { name: 'Inter', value: "'Inter', sans-serif" },
    { name: 'Yusei Magic', value: "'Yusei Magic', sans-serif" },
];

const keyToLabelMap: Record<string, { label: string; description: string }> = {
    font_family_base: { label: '基本フォント', description: 'サイト全体の基本的な文字フォントを指定します。' },
    font_family_heading: { label: '見出しフォント', description: 'H1, H2などの見出し部分に使われるフォントです。' },
    font_size_base: { label: '基本フォントサイズ', description: '本文などの基本的な文字の大きさです。(例: 16px)' },
    base_line_height: { label: '基本行間', description: '文章の読みやすさに影響する行の高さを指定します。(例: 1.75)' },
    base_letter_spacing: { label: '基本文字間隔', description: '文字と文字の間隔を調整します。(例: normal)' },
    link_color: { label: 'リンクの色', description: 'クリック可能なテキストリンクの色です。' },
    link_color_hover: { label: 'リンクの色 (ホバー)', description: 'リンクにマウスを乗せた時の色です。' },
    link_text_decoration: { label: 'リンクの下線', description: '通常時のリンクの下線の有無などを指定します。(例: none, underline)' },
    link_text_decoration_hover: { label: 'リンクの下線 (ホバー)', description: 'マウスを乗せた時のリンクの下線の有無です。' },
    focus_ring_color: { label: 'フォーカスリングの色', description: 'キーボード操作時などに表示される要素の周りの枠線の色です。' },
    focus_ring_width: { label: 'フォーカスリングの太さ', description: 'フォーカスリングの枠線の太さです。(例: 3px)' },
    focus_ring_offset: { label: 'フォーカスリングのオフセット', description: '要素とフォーカスリングの間隔です。(例: 2px)' },
    selection_bg_color: { label: 'テキスト選択時の背景色', description: '文章をドラッグで選択した際の背景色です。' },
    selection_text_color: { label: 'テキスト選択時の文字色', description: '文章を選択した際の文字色です。' },
    scrollbar_thumb_color: { label: 'スクロールバーの色', description: 'スクロールバーのつまみの部分の色です。' },
    scrollbar_track_color: { label: 'スクロールバーの背景色', description: 'スクロールバーの背景部分の色です。' },
    site_max_width: { label: 'サイト最大幅', description: 'PCで表示した際のサイト全体の横幅の上限です。(例: 1536px)' },
    container_padding_x: { label: 'コンテナ左右余白', description: 'コンテンツエリアの左右の余白です。(例: 1rem)' },
    spacing_unit_base: { label: '基本スペーシング単位', description: '余白や間隔の基本となる単位です。(例: 8px)' },
    section_padding_y_sm: { label: 'セクション縦余白 (小)', description: '各コンテンツエリアの上下の小さな余白です。(例: 48px)' },
    section_padding_y_lg: { label: 'セクション縦余白 (大)', description: '各コンテンツエリアの上下の大きな余白です。(例: 96px)' },
    grid_column_gap: { label: 'グリッド列の間隔', description: 'グリッドレイアウトの列と列の間のスペースです。(例: 24px)' },
    grid_row_gap: { label: 'グリッド行の間隔', description: 'グリッドレイアウトの行と行の間のスペースです。(例: 24px)' },
    divider_color: { label: '区切り線の色', description: 'コンテンツを区切る線の色です。' },
    divider_thickness: { label: '区切り線の太さ', description: 'コンテンツを区切る線の太さです。(例: 1px)' },
    primary_color: { label: 'プライマリーカラー', description: 'サイトのメインカラー。ボタンやヘッダーなどに使用されます。' },
    secondary_color: { label: 'セカンダリーカラー', description: 'リンクやアクセントとして使用される2番目の色です。' },
    accent_color: { label: 'アクセントカラー', description: '注意を引くための色。エラーメッセージや特別なボタンに使用されます。' },
    background_color_base: { label: '基本背景色', description: 'サイト全体の最も基本的な背景色です。' },
    background_color_subtle: { label: 'サブ背景色', description: 'セクションの区切りなど、少しだけ変化をつけたい背景に使います。' },
    surface_color: { label: 'サーフェスカラー', description: 'カードやヘッダーなど、背景の上に乗る要素の背景色です。' },
    text_color_base: { label: '基本テキストカラー', description: '本文などの基本的な文字色です。' },
    text_color_secondary: { label: 'サブテキストカラー', description: '補足情報など、少し控えめな文字色です。' },
    text_color_heading: { label: '見出しテキストカラー', description: '見出し部分の文字色です。' },
    border_color_base: { label: '基本ボーダーカラー', description: '区切り線や要素の枠線に使われる色です。' },
    base_border_radius: { label: '基本角丸サイズ', description: 'ボタンやカードの角の丸みを指定します。(例: 0.5rem)' },
    shadow_sm: { label: '影 (小)', description: '小さな影のスタイルです。' },
    shadow_base: { label: '影 (基本)', description: '標準的な影のスタイルです。' },
    shadow_md: { label: '影 (中)', description: '中程度の影のスタイルです。' },
    shadow_lg: { label: '影 (大)', description: '大きな影のスタイルです。' },
    button_primary_bg_color: { label: '主要ボタンの背景色', description: 'サイトの最も重要なボタンの背景色です。' },
    button_primary_text_color: { label: '主要ボタンの文字色', description: 'サイトの最も重要なボタンの文字色です。' },
    button_primary_bg_color_hover: { label: '主要ボタンの背景色 (ホバー)', description: '主要ボタンにマウスを乗せた時の背景色です。' },
    form_input_bg_color: { label: '入力フォームの背景色', description: 'テキストフィールドなどの背景色です。' },
    form_input_text_color: { label: '入力フォームの文字色', description: '入力された文字の色です。' },
    form_input_border_color: { label: '入力フォームの枠線色', description: 'フォームの枠線の色です。' },
    form_input_border_color_focus: { label: '入力フォームの枠線色 (フォーカス)', description: 'フォームを選択した時の枠線の色です。' },
    card_bg_color: { label: 'カードの背景色', description: '情報カードなどの背景色です。' },
    card_border: { label: 'カードの枠線', description: '情報カードの枠線のスタイルです。(例: 1px solid var(--border-color-base))' },
    card_shadow: { label: 'カードの影', description: '情報カードの影のスタイルです。' },
    site_base_url: { label: 'サイトのベースURL', description: 'サイトの正規URL。SEOやメタタグ生成に使用されます。'},
    enable_coming_soon_page: { label: '準備中ページを有効にする', description: '有効にすると、管理者以外はサイトを閲覧できなくなります。' },
    coming_soon_page_title: { label: '準備中ページのタイトル', description: '準備中ページに表示されるメインの見出しです。' },
    coming_soon_page_message: { label: '準備中ページのメッセージ', description: '準備中ページに表示される説明文です。' },
};

const parseThemeCsv = (csvText: string): ThemeItem[] => {
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    return lines.map(line => {
        const parts = line.split(/,(.*)/s);
        const rawKey = parts[0] ? parts[0].trim() : '';
        let value = parts[1] ? parts[1].trim() : '';
        const isHeader = rawKey.startsWith('"') && rawKey.endsWith('"') && value === '';
        const key = rawKey.replace(/^"|"$/g, '');
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }
        return { key, value, isHeader };
    });
};

const themeToCsv = (items: ThemeItem[]): string => {
    return items.map(item => {
        let key = item.isHeader ? `"${item.key.replace(/"/g, '""')}"` : item.key;
        let value = item.value;
        if (!item.isHeader && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
        }
        return item.isHeader ? `${key},` : `${key},${value}`;
    }).join('\n');
};

// FIX: Changed named export to default export for React.lazy compatibility.
const ThemeEditor: React.FC<ThemeEditorProps> = ({ isLocked }) => {
    const [themeItems, setThemeItems] = useState<ThemeItem[]>([]);
    const [originalItems, setOriginalItems] = useState<ThemeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [inspectorActive, setInspectorActive] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/templates/theme_settings.csv?cachebust=' + new Date().getTime());
            if (!response.ok) throw new Error('テーマ設定ファイルの読み込みに失敗しました。');
            
            const csvText = await response.text();
            const parsedItems = parseThemeCsv(csvText);
            setThemeItems(parsedItems);
            setOriginalItems(parsedItems);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, payload } = event.data;
            if (type === 'ELEMENT_CLICKED' && payload.variable) {
                const key = payload.variable.replace('--', '').replace(/-/g, '_');
                const settingElement = document.querySelector(`[data-key="${key}"]`);
                if (settingElement) {
                    settingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    settingElement.classList.add('ring-2', 'ring-secondary', 'ring-offset-2');
                    setTimeout(() => {
                        settingElement.classList.remove('ring-2', 'ring-secondary', 'ring-offset-2');
                    }, 2500);
                }
                setInspectorActive(false); // Deactivate after selection
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        iframeRef.current?.contentWindow?.postMessage({
            type: 'INSPECTOR_MODE_TOGGLE',
            payload: { active: inspectorActive }
        }, '*');
    }, [inspectorActive]);

    const handleValueChange = (keyToUpdate: string, newValue: string) => {
        setThemeItems(prevItems =>
            prevItems.map(item =>
                item.key === keyToUpdate ? { ...item, value: newValue } : item
            )
        );
        if (iframeRef.current?.contentWindow) {
            const kebabKey = keyToUpdate.replace(/_/g, '-');
            iframeRef.current.contentWindow.postMessage({
                type: 'THEME_UPDATE',
                payload: { key: `--${kebabKey}`, value: newValue }
            }, '*');
        }
    };
    
    const handleMouseEnter = (key: string) => {
        if (iframeRef.current?.contentWindow) {
            const kebabKey = key.replace(/_/g, '-');
            iframeRef.current.contentWindow.postMessage({
                type: 'HIGHLIGHT_ELEMENT',
                payload: { key: `--${kebabKey}` }
            }, '*');
        }
    };

    const handleMouseLeave = () => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'CLEAR_HIGHLIGHT' }, '*');
        }
    };


    const handleSaveChanges = async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            const csvContent = themeToCsv(themeItems);
            const response = await fetch('/api/save_theme_settings.php', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: csvContent,
            });
            const responseData = await response.json();
            if (!response.ok || !responseData.success) {
                throw new Error(responseData.message || '保存に失敗しました。');
            }
            setSaveStatus('success');
            setOriginalItems(JSON.parse(JSON.stringify(themeItems)));
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
             setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
             setSaveStatus('error');
             setTimeout(() => setSaveStatus('idle'), 5000);
        } finally {
            setSaving(false);
        }
    };
    
    const isDirty = useMemo(() => JSON.stringify(themeItems) !== JSON.stringify(originalItems), [themeItems, originalItems]);

    if (loading) return <div className="p-8"><i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...</div>;
    if (error) return <div className="p-8 text-red-600">エラー: {error}</div>;

    const groupedItems = themeItems.reduce((acc, item) => {
        if (item.isHeader) {
            acc.push({ title: item.key, items: [] });
        } else if (acc.length > 0 && item.key) {
            acc[acc.length - 1].items.push(item);
        }
        return acc;
    }, [] as { title: string; items: ThemeItem[] }[]);

    const renderSetting = (item: ThemeItem) => {
        const { label, description } = keyToLabelMap[item.key] || { label: item.key, description: '' };
        
        let component;
        switch (true) {
            case item.key.includes('_color'):
                component = <ColorInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} />;
                break;
            case item.key.includes('font_family'):
                component = <SelectInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} options={googleFonts.map(f => ({ label: f.name, value: f.value }))} />;
                break;
            case item.key.includes('decoration'):
                component = <SelectInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} options={['none', 'underline', 'overline', 'line-through'].map(o => ({label: o, value: o}))} />;
                break;
            case item.key.includes('letter_spacing'):
                 component = <SelectInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} options={[{label:'標準', value:'normal'}, {label:'狭く', value:'-0.025em'}, {label:'広く', value:'0.05em'}]} />;
                 break;
            case item.key.includes('line_height'):
                component = <SelectInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} options={['1.25', '1.5', '1.75', '2'].map(o => ({label: o, value: o}))} />;
                break;
            case item.key.includes('font_size'):
                 component = <UnitInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} units={['px', 'rem', 'em']} options={[14,15,16,17,18]} />;
                 break;
            case item.key.includes('border_radius') || item.key.includes('padding') || item.key.includes('width') || item.key.includes('gap') || item.key.includes('offset') || item.key.includes('thickness'):
                 component = <UnitInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} units={['px', 'rem', 'em', '%']} />;
                 break;
            case item.key.includes('shadow'):
                component = <ShadowInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} />;
                break;
            case item.key.includes('border') && !item.key.includes('color'):
                component = <BorderInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} />;
                break;
            case item.key.startsWith('enable_') || item.key.startsWith('show_'):
                component = <CheckboxInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} />;
                break;
            default:
                component = <TextInput value={item.value} onChange={(v) => handleValueChange(item.key, v)} />;
                break;
        }

        return (
            <div
                key={item.key}
                data-key={item.key}
                onMouseEnter={() => handleMouseEnter(item.key)}
                onMouseLeave={handleMouseLeave}
                className="p-2 -m-2 rounded-md transition-all duration-300"
            >
                <label htmlFor={item.key} className="text-sm font-medium text-gray-700">{label}</label>
                <div className="mt-1">{component}</div>
                {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans relative">
            {isLocked && <LockedOverlay />}
            <div className="w-1/3 flex flex-col h-screen border-r bg-white">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">ライブテーマエディタ</h2>
                        <p className="text-sm text-gray-500">リアルタイムでサイトデザインを編集</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setInspectorActive(p => !p)} className={`w-10 h-10 flex items-center justify-center rounded-md border transition-colors ${inspectorActive ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`} title="要素を選択して編集">
                            <i className="fas fa-mouse-pointer"></i>
                        </button>
                        <button onClick={handleSaveChanges} disabled={saving || !isDirty} className="bg-secondary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors disabled:bg-gray-400 enabled:hover:bg-indigo-700">
                            {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>保存中...</> : '変更を保存'}
                        </button>
                    </div>
                </div>
                 {saveStatus === 'success' && <div className="m-2 p-2 bg-green-100 text-green-800 border border-green-200 text-sm rounded-md animate-fade-in-up">正常に保存されました。</div>}
                 {saveStatus === 'error' && <div className="m-2 p-2 bg-red-100 text-red-800 border border-red-200 text-sm rounded-md animate-fade-in-up">{error}</div>}
                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {groupedItems.map(group => (
                        <div key={group.title}>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">{group.title.split('. ')[1]}</h3>
                            <div className="space-y-4">{group.items.map(item => renderSetting(item))}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-2/3 h-screen overflow-y-auto bg-white">
                 <div className="p-2 bg-gray-800 text-white text-sm text-center sticky top-0 z-10">
                    <i className="fas fa-eye mr-2"></i>ライブプレビュー {inspectorActive && <span className="ml-4 font-bold text-secondary animate-pulse"><i className="fas fa-mouse-pointer mr-2"></i>要素選択モード有効</span>}
                </div>
                <iframe ref={iframeRef} src="/" title="Site Preview" className={`w-full h-full border-0 ${inspectorActive ? 'pointer-events-none' : ''}`} />
            </div>
        </div>
    );
};

// --- Input Components ---
const CheckboxInput: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    const isChecked = value === 'TRUE';
    return (
        <label className="flex items-center space-x-2 cursor-pointer">
            <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => onChange(e.target.checked ? 'TRUE' : 'FALSE')}
                className="h-5 w-5 rounded border-gray-300 text-secondary focus:ring-secondary"
            />
            <span className={`text-sm font-medium ${isChecked ? 'text-gray-700' : 'text-gray-500'}`}>
                {isChecked ? '有効' : '無効'}
            </span>
        </label>
    );
};
const AdvancedInputWrapper: React.FC<{ value: string, onRawChange: (val: string) => void, children: React.ReactNode }> = ({ value, onRawChange, children }) => {
    const [isDirectEdit, setIsDirectEdit] = useState(false);
    return (
        <div className="space-y-2">
            <div className={`flex items-center gap-2 ${isDirectEdit ? 'hidden' : ''}`}>{children}</div>
            <div className={`flex items-center gap-2 ${!isDirectEdit ? 'hidden' : ''}`}>
                <input type="text" value={value} onChange={(e) => onRawChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm" />
            </div>
             <button onClick={() => setIsDirectEdit(p => !p)} className="text-gray-400 hover:text-secondary text-xs p-1" title="直接編集モードを切り替え">
                <i className={`fas ${isDirectEdit ? 'fa-unlock' : 'fa-lock'}`}></i>
            </button>
        </div>
    );
};

const ColorInput: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    let colorPickerValue = value;
    if (value.startsWith('var')) { colorPickerValue = '#ffffff'; } 
    else if (value.startsWith('#') && value.length === 9) { colorPickerValue = value.substring(0, 7); }
    return (
        <div className="flex items-center">
            <input type="color" value={colorPickerValue} onChange={(e) => onChange(e.target.value)} className="p-0 h-10 w-10 border-gray-300 rounded-md cursor-pointer" title="カラーピッカー" />
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm ml-2" />
        </div>
    );
};

const SelectInput: React.FC<{ value: string, onChange: (val: string) => void, options: {value: string, label: string}[] }> = ({ value, onChange, options }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm">
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
);
const TextInput: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => (
     <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
);

const UnitInput: React.FC<{ value: string, onChange: (val: string) => void, units: string[], options?: number[] }> = ({ value, onChange, units, options }) => {
    const { number, unit } = parseCssValue(value);
    return (
        <AdvancedInputWrapper value={value} onRawChange={onChange}>
            {options ? (
                 <select value={number} onChange={(e) => onChange(e.target.value + unit)} className="w-full p-2 border border-gray-300 rounded-md text-sm">
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : (
                <input type="number" value={number} onChange={(e) => onChange(e.target.value + unit)} step={0.1} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
            )}
            <select value={unit} onChange={(e) => onChange(number + e.target.value)} className="p-2 border border-gray-300 rounded-md bg-gray-50 text-sm">
                {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
        </AdvancedInputWrapper>
    );
};

const ShadowInput: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
    const shadow = useMemo(() => parseShadowValue(value), [value]);
    const updateShadow = (part: Partial<typeof shadow>) => {
        const newShadow = { ...shadow, ...part };
        const color = colord(newShadow.color).alpha(newShadow.opacity).toRgbString();
        onChange(`${newShadow.x} ${newShadow.y} ${newShadow.blur} ${newShadow.spread} ${color}`);
    };
    return (
        <AdvancedInputWrapper value={value} onRawChange={onChange}>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <span>X: <input type="text" value={shadow.x} onChange={e => updateShadow({x: e.target.value})} className="w-12 p-1 border rounded"/></span>
                <span>Y: <input type="text" value={shadow.y} onChange={e => updateShadow({y: e.target.value})} className="w-12 p-1 border rounded"/></span>
                <span>Blur: <input type="text" value={shadow.blur} onChange={e => updateShadow({blur: e.target.value})} className="w-12 p-1 border rounded"/></span>
                <span>Spread: <input type="text" value={shadow.spread} onChange={e => updateShadow({spread: e.target.value})} className="w-12 p-1 border rounded"/></span>
            </div>
            <div className="flex items-center gap-1">
                <input type="color" value={shadow.color} onChange={e => updateShadow({color: e.target.value})} className="w-8 h-8 p-0 border rounded cursor-pointer"/>
                <input type="range" min="0" max="1" step="0.01" value={shadow.opacity} onChange={e => updateShadow({opacity: parseFloat(e.target.value)})} className="w-full"/>
            </div>
        </AdvancedInputWrapper>
    );
};

const BorderInput: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
    const border = useMemo(() => parseBorderValue(value), [value]);
    const updateBorder = (part: Partial<typeof border>) => {
        const newBorder = { ...border, ...part };
        onChange(`${newBorder.width}${newBorder.unit} ${newBorder.style} ${newBorder.color}`);
    };
    return (
        <AdvancedInputWrapper value={value} onRawChange={onChange}>
            <input type="number" value={border.width} onChange={e => updateBorder({width: parseInt(e.target.value, 10)})} className="w-16 p-2 border rounded-md text-sm" />
            <select value={border.style} onChange={e => updateBorder({style: e.target.value})} className="p-2 border rounded-md bg-gray-50 text-sm">
                {['solid', 'dashed', 'dotted', 'double', 'none'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ColorInput value={border.color} onChange={val => updateBorder({color: val})} />
        </AdvancedInputWrapper>
    );
};

export default ThemeEditor;