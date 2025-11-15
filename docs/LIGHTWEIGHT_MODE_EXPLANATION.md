# 軽量モード（Lightweight Mode）の詳細説明

## 軽量モードとは？

軽量モードは、**大規模なデータセット（数万件の商品データ）を効率的に処理するための最適化機能**です。特に、モバイルデバイスでのメモリ使用量とネットワーク転送量を大幅に削減します。

## 軽量モードの動作

### 通常モード（フルモード）

```sql
-- すべてのカラムを取得
SELECT * FROM products_master;
```

**取得されるデータ例**:
- `id`
- `productCode`
- `productName` (長いテキスト)
- `description` (非常に長いテキスト)
- `brand_id`
- `category_id`
- `images` (JSON形式、複数の画像URL)
- `is_published`
- `jan_code`
- `created_at`
- `updated_at`
- その他すべてのカラム

**データサイズ**: 1商品あたり約2KB（画像URLや説明文を含む）

### 軽量モード

```sql
-- 最小限のカラムのみを取得
SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published`, `jan_code` 
FROM products_master;
```

**取得されるデータ**:
- `id` - 商品ID（必須）
- `productCode` - 商品コード（検索・表示用）
- `brand_id` - ブランドID（フィルタリング用）
- `category_id` - カテゴリID（フィルタリング用）
- `is_published` - 公開フラグ（表示制御用）
- `jan_code` - JANコード（検索用）

**データサイズ**: 1商品あたり約200バイト（約90%削減）

## データサイズの比較

### 10,000商品の場合

| モード | データサイズ | 転送時間（3G） | メモリ使用量 |
|--------|------------|--------------|------------|
| フルモード | 約20MB | 約53秒 | 約40MB |
| 軽量モード | 約2MB | 約5秒 | 約4MB |

### 100,000商品の場合

| モード | データサイズ | 転送時間（3G） | メモリ使用量 |
|--------|------------|--------------|------------|
| フルモード | 約200MB | 約9分 | 約400MB |
| 軽量モード | 約20MB | 約53秒 | 約40MB |

## モバイルでの動作

### 自動適用

見積作成ツール（Estimator）では、`phase=products`を指定すると**自動的に軽量モードが適用**されます：

```typescript
// 自動的に軽量モードが適用される
const productData = await fetchEstimatorData('products');
```

### モバイルでのメリット

1. **ネットワーク転送量の削減**
   - 3G回線でも高速に読み込める
   - データ通信量を大幅に削減

2. **メモリ使用量の削減**
   - モバイルデバイスの限られたメモリを効率的に使用
   - アプリのクラッシュリスクを低減

3. **読み込み速度の向上**
   - データ転送時間が大幅に短縮
   - ユーザー体験の向上

### 詳細データの取得

軽量モードでは、商品の詳細情報（説明、画像URLなど）は含まれません。詳細情報が必要な場合は、個別に取得します：

```typescript
// 商品選択時に詳細データを読み込む
const productDetails = await fetchTables(
    [`product_details_manu_0001`], 
    { toolName: 'product-management' }
);
```

## 実装の詳細

### PHP側（`api/estimator-data.php`）

```php
// 軽量モードの判定
$autoLightweight = ($phase === 'products');

// 軽量モードの場合、最小限のカラムのみ取得
if ($lightweight && $tableName === 'products_master') {
    $stmt = $pdo->query("SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published`, `jan_code` FROM `{$tableName}`");
} else {
    $stmt = $pdo->query("SELECT * FROM `{$tableName}`");
}
```

### フロントエンド側

```typescript
// 見積作成ツールでは自動的に軽量モードが適用される
const newData = await fetchEstimatorData('products');
```

## 使用例

### 見積作成ツール

```typescript
// 1. 必須データを読み込む（軽量モード不要）
const essentialData = await fetchEstimatorData('essential');

// 2. 商品データを読み込む（自動的に軽量モード）
const productData = await fetchEstimatorData('products');
// → 10,000商品 = 約2MB

// 3. 商品選択時に詳細データを読み込む（必要に応じて）
const selectedProductDetails = await fetchTables(
    [`product_details_manu_0001`],
    { toolName: 'product-management' }
);
```

### 商品管理ツール

```typescript
// 明示的に軽量モードを指定
const productData = await fetchTables(
    ['products_master_manu_0001'],
    { 
        toolName: 'product-management',
        lightweight: true  // 軽量モードを明示的に指定
    }
);
```

## 注意事項

1. **軽量モードでは詳細情報が含まれない**
   - 商品名、説明、画像URLなどは含まれません
   - 必要に応じて個別に取得してください

2. **検索・フィルタリングは可能**
   - `productCode`、`brand_id`、`category_id`で検索・フィルタリング可能
   - 商品選択画面での使用に最適

3. **モバイルでの推奨設定**
   - 見積作成ツールでは自動的に適用されるため、追加設定は不要
   - 商品管理ツールでは、必要に応じて`lightweight: true`を指定

## まとめ

- **軽量モード**: 最小限のカラムのみを取得（約90%のデータ削減）
- **自動適用**: 見積作成ツールでは`phase=products`で自動適用
- **モバイル対応**: ネットワーク転送量とメモリ使用量を大幅に削減
- **詳細データ**: 必要に応じて個別に取得

これにより、モバイルデバイスでも数万件の商品データを快適に扱うことができます。

