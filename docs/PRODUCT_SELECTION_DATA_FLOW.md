# 商品選択モーダルのデータ取得フロー

## 概要

商品選択モーダルでは、メーカー依存テーブルから商品データを取得し、フロントエンドで結合して表示します。

## データ取得の流れ

### 1. メーカー選択時

`ProductSelectionPage`でメーカーが選択されると、以下のテーブルを読み込みます：

```typescript
const manufacturerTables = [
    `products_master_${selectedManufacturer}`,
    `product_details_${selectedManufacturer}`,
    // ... その他のテーブル
];
```

### 2. データの結合

`productsForCardDisplay`で、`products_master`と`product_details`を結合します：

```typescript
// product_detailsを起点に、products_masterと結合
// product_details.product_id = products_master.id でマッチング
const productDetails = getManufacturerTableData(database, 'product_details', selectedManufacturer);
const productsMaster = getManufacturerTableData(database, 'products_master', selectedManufacturer);

productDetails.forEach((detail: Row) => {
    const productId = detail.product_id as string;
    const productMaster = productsMaster.find((p: Row) => p.id === productId);
    if (productMaster) {
        const product: Row = {
            ...productMaster, // id, productCode, manufacturer_id, brand_id, category_id等
            productName: detail.productName,
            description: detail.description,
            images: detail.images,
            id: productId
        };
        productMap.set(productId, product);
    }
});
```

### 3. 軽量モードでのデータ取得

見積作成V2では、`phase=products`を指定すると自動的に軽量モードが適用されます：

**`products_master`（軽量モード）**:
- `id` - 商品ID
- `productCode` - 品番
- `brand_id` - ブランドID
- `category_id` - カテゴリID
- `is_published` - 公開フラグ
- `manufacturer_id` - **メーカーID（必須）**

**`product_details`（軽量モード）**:
- `product_id` - 商品ID（結合用）
- `productName` - 商品名
- `images` - 画像URL

### 4. データ表示

`ProductSelectionGrid`で、結合されたデータを表示します：

```typescript
// productDetailsMapを作成
const productDetailsMap = new Map(
    productDetailsTable.data.map(detail => [String(detail.product_id), detail])
);

// 各商品カードで使用
const detail = productDetailsMap.get(rowId);
```

## 重要なポイント

### `manufacturer_id`の必須性

`manufacturer_id`は以下の用途で使用されるため、**必須**です：

1. **メーカー依存テーブルの取得**: `getManufacturerTable(database, 'product_details', manufacturerId)`
2. **ブランド名の取得**: `getBrandNameForProduct(database, rowId, manufacturerId)`
3. **タグ情報の取得**: `getManufacturerTable(database, 'product_tags', manufacturerId)`
4. **在庫情報の取得**: `getProductInfoFromStock(database, manufacturerId, productCode)`

### 軽量モードでの注意点

軽量モードでは、最小限のカラムのみを取得しますが、`manufacturer_id`は**必須**です：

```php
// 軽量モードでもmanufacturer_idを含める
SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published`, `manufacturer_id` 
FROM `products_master_manu_XXXX`;
```

### データ結合の順序

1. `product_details`を起点に結合（`product_details`が主テーブル）
2. `product_details.product_id = products_master.id`でマッチング
3. `products_master`に存在しない商品は表示されない

### メーカー依存テーブルの取得

`getManufacturerTableData`を使用して、メーカー別テーブルを取得します：

```typescript
const productDetails = getManufacturerTableData(database, 'product_details', selectedManufacturer);
// → `product_details_manu_${selectedManufacturer}`テーブルから取得
```

## 問題の確認ポイント

### 1. `manufacturer_id`が取得できているか

軽量モードで`manufacturer_id`が含まれているか確認：

```php
// ✅ 正しい（manufacturer_idを含む）
SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published`, `manufacturer_id` 
FROM `products_master_manu_XXXX`;

// ❌ 間違い（manufacturer_idが含まれていない）
SELECT `id`, `productCode`, `brand_id`, `category_id`, `is_published` 
FROM `products_master_manu_XXXX`;
```

### 2. メーカー依存テーブルが正しく取得できているか

`getManufacturerTableData`が正しく動作しているか確認：

```typescript
const productDetails = getManufacturerTableData(database, 'product_details', selectedManufacturer);
// → `product_details_manu_${selectedManufacturer}`テーブルから取得される
```

### 3. データの結合が正しく動作しているか

`product_details.product_id = products_master.id`でマッチングが正しく動作しているか確認：

```typescript
const productMaster = productsMaster.find((p: Row) => p.id === productId);
// → productIdが一致するproducts_masterのレコードを取得
```

## まとめ

- **軽量モード**: 最小限のカラムのみ取得（`manufacturer_id`は必須）
- **データ結合**: フロントエンドで`product_id`で結合
- **メーカー依存テーブル**: `getManufacturerTableData`で取得
- **`manufacturer_id`の必須性**: メーカー依存テーブルの取得に必要

これにより、メーカー依存データが正しく動作します。

