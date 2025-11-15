# パフォーマンス最適化ガイド

## 大規模データセット（数万件の商品データ）への対応

### 現在の実装

1. **軽量モード（Lightweight Mode）**
   - `phase=products`の場合、自動的に軽量モードが適用されます
   - `products_master`テーブルは最小限のカラム（`id`, `productCode`, `brand_id`, `category_id`, `is_published`, `jan_code`）のみを取得
   - これにより、データ転送量とメモリ使用量を大幅に削減

2. **段階的読み込み**
   - `phase=essential`: 必須データ（設定、マスタ、価格設定など）
   - `phase=products`: 商品データ（軽量モード）
   - `phase=customers`: 顧客データ（軽量モード）

3. **メーカーごとの読み込み**
   - `ProductSelectionPage`では、選択されたメーカーのデータのみを読み込む
   - 全メーカーのデータを一度に読み込まない

### 推奨される使用方法

#### 見積作成ツール（Estimator）

```typescript
// 1. 必須データを読み込む
const essentialData = await fetchEstimatorData('essential');

// 2. 商品データを読み込む（自動的に軽量モード）
const productData = await fetchEstimatorData('products');

// 3. 商品選択時に詳細データを読み込む（必要に応じて）
const productDetails = await fetchTables(['product_details_manu_0001'], { 
    toolName: 'product-management' 
});
```

#### 商品管理ツール（Product Management）

```typescript
// メーカーごとに段階的に読み込む
const manufacturerId = 'manu_0001';
const tables = [
    `products_master_${manufacturerId}`,
    `product_details_${manufacturerId}`,
    // ... 他のテーブル
];
const data = await fetchTables(tables, { toolName: 'product-management' });
```

### メモリ使用量の目安

- **軽量モード（products_master）**: 1商品あたり約200バイト
  - 10,000商品 = 約2MB
  - 100,000商品 = 約20MB

- **フルモード（products_master）**: 1商品あたり約2KB
  - 10,000商品 = 約20MB
  - 100,000商品 = 約200MB

### さらなる最適化が必要な場合

1. **ページネーション**
   - フロントエンドでページネーションを実装済み
   - 表示するデータのみを保持

2. **仮想スクロール**
   - 大量のデータを表示する場合は、仮想スクロールの実装を検討

3. **サーバーサイドページネーション**
   - データベース側でページネーションを実装
   - `LIMIT`と`OFFSET`を使用

4. **インデックス最適化**
   - データベースのインデックスを適切に設定
   - `productCode`, `brand_id`, `category_id`などにインデックスを設定

### 注意事項

- 軽量モードでは、商品の詳細情報（説明、画像URLなど）は含まれません
- 詳細情報が必要な場合は、個別に`product_details`テーブルを読み込んでください
- メモリ使用量が大きい場合は、ブラウザの開発者ツールでメモリプロファイルを確認してください

