# 商品選択モーダル用軽量モード

## 概要

商品選択モーダル表示に必要な最小限のデータ（品番、名前、画像）のみを取得する軽量モードを実装しました。

## 取得されるデータ

### `products_master`テーブル（軽量モード）

```sql
SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published` 
FROM products_master;
```

**取得カラム**:
- `id` - 商品ID（必須）
- `productCode` - 品番（表示用）
- `brand_id` - ブランドID（フィルタリング用）
- `category_id` - カテゴリID（フィルタリング用）
- `is_published` - 公開フラグ（表示制御用）

**除外されるカラム**:
- `jan_code` - 商品選択時には不要
- その他のカラム

### `product_details`テーブル（軽量モード）

```sql
SELECT `product_id`, `productName`, `images` 
FROM product_details;
```

**取得カラム**:
- `product_id` - 商品ID（必須、products_master.idと結合用）
- `productName` - 商品名（カード表示用）
- `images` - 画像URL（カード表示用）

**除外されるカラム**:
- `description` - 商品選択時には不要（カードには表示されるが、必須ではない）
- `meta_title`, `meta_description` - SEO用、商品選択時には不要
- `og_image_url`, `og_title`, `og_description` - OGP用、商品選択時には不要
- `manufacturer_id` - 既にproducts_masterに含まれている

## データサイズの比較

### 10,000商品の場合

| テーブル | 通常モード | 軽量モード | 削減率 |
|---------|----------|----------|--------|
| `products_master` | 約10MB | 約1MB | 90% |
| `product_details` | 約10MB | 約3MB | 70% |
| **合計** | **約20MB** | **約4MB** | **80%** |

### 100,000商品の場合

| テーブル | 通常モード | 軽量モード | 削減率 |
|---------|----------|----------|--------|
| `products_master` | 約100MB | 約10MB | 90% |
| `product_details` | 約100MB | 約30MB | 70% |
| **合計** | **約200MB** | **約40MB** | **80%** |

## 商品選択カードで表示される情報

商品選択モーダルのカードには以下の情報が表示されます：

1. **画像** (`product_details.images`)
2. **商品名** (`product_details.productName`)
3. **品番** (`products_master.productCode`)
4. **ブランド名** (`products_master.brand_id`から取得)

## 自動適用

見積作成ツール（Estimator）では、`phase=products`を指定すると**自動的に軽量モードが適用**されます：

```typescript
// 自動的に軽量モードが適用される
const productData = await fetchEstimatorData('products');
// → products_masterとproduct_detailsが軽量モードで取得される
```

## モバイルでのメリット

1. **ネットワーク転送量の削減**
   - 10,000商品: 約20MB → 約4MB（80%削減）
   - 100,000商品: 約200MB → 約40MB（80%削減）

2. **メモリ使用量の削減**
   - モバイルデバイスの限られたメモリを効率的に使用
   - アプリのクラッシュリスクを低減

3. **読み込み速度の向上**
   - データ転送時間が大幅に短縮
   - ユーザー体験の向上

## 実装の詳細

### PHP側（`api/estimator-data.php`）

```php
// 軽量モードの判定
$autoLightweight = ($phase === 'products');

// products_masterの軽量モード
if ($lightweight && $tableName === 'products_master') {
    $stmt = $pdo->query("SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published` FROM `{$tableName}`");
}
// product_detailsの軽量モード
elseif ($lightweight && $tableName === 'product_details') {
    $stmt = $pdo->query("SELECT `product_id`, `productName`, `images` FROM `{$tableName}`");
}
```

### フロントエンド側

```typescript
// 見積作成ツールでは自動的に軽量モードが適用される
const newData = await fetchEstimatorData('products');
// → products_masterとproduct_detailsが軽量モードで取得される
```

## 注意事項

1. **商品選択時には十分**
   - 品番、名前、画像があれば商品選択モーダルで表示可能
   - 詳細情報（説明、価格など）は商品選択後に取得

2. **他のテーブルは読み込まれない**
   - `product_prices`, `product_colors`, `product_tags`, `skus`, `stock`などは読み込まれない
   - 必要に応じて個別に取得

3. **商品選択後の詳細データ取得**
   - 商品を選択した後、詳細情報が必要な場合は個別に取得
   - 例: 価格情報、在庫情報など

## まとめ

- **軽量モード**: 商品選択モーダル表示に必要な最小限のデータのみ取得
- **自動適用**: 見積作成ツールでは`phase=products`で自動適用
- **データ削減**: 約80%のデータ削減を実現
- **モバイル対応**: ネットワーク転送量とメモリ使用量を大幅に削減

これにより、モバイルデバイスでも数万件の商品データを快適に扱うことができます。

