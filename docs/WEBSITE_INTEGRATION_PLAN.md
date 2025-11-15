# 既存ウェブサイト統合計画

## 概要

既存のウェブサイト（`nassenbrothers_website`）を管理用フロントエンドに統合し、顧客向け機能を提供する計画です。

## 既存ウェブサイトの確認結果

### フォルダ構造

```
nassenbrothers_website/
├── components/          # Reactコンポーネント
│   ├── MyPage.tsx       # 顧客マイページ
│   ├── Estimator.tsx    # 見積作成
│   ├── LoginPage.tsx    # ログインページ
│   └── ...
├── api/                 # PHP APIエンドポイント
│   ├── login-request.php.txt
│   ├── login-verify.php.txt
│   ├── my-page-data.php.txt
│   ├── save_quote.php.txt
│   └── ...
├── services/            # サービス層
│   ├── apiService.ts
│   └── costService.ts
├── templates/           # テンプレートファイル
│   ├── theme_settings.csv
│   ├── ui_text.csv
│   └── pages_content.json
└── database_setup.sql.txt
```

### 主要機能

1. **マジックリンク認証**
   - メールアドレスのみでログイン
   - 15分間有効なワンタイムトークン
   - JWTによるセッション管理

2. **顧客マイページ**
   - 顧客情報の管理
   - 配送先アドレス帳
   - 見積一覧・編集
   - 案件進行状況の閲覧
   - PDF出力（見積書、納品書、請求書、領収書）

3. **見積作成機能**
   - 顧客が自分で見積を作成
   - 商品選択、プリント設定、見積計算
   - 見積の保存・送信

---

## 統合方針

### 方針: 管理用フロントエンド内に統合

既存のウェブサイトを管理用フロントエンドの機能として統合し、同じデータベースを使用して顧客向け機能を提供する。

**メリット**:
- 統一された技術スタック（React + TypeScript）
- データベースとの連携が容易
- 既存の管理機能を活用可能

---

## データベース統合

### 追加が必要なテーブル

#### 1. `login_tokens` テーブル

```sql
CREATE TABLE `login_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) NOT NULL,
  `token` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_email` (`user_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

**用途**: マジックリンク認証用のワンタイムトークン管理

#### 2. `shipping_addresses` テーブル

```sql
CREATE TABLE `shipping_addresses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `zip_code` varchar(10) NOT NULL,
  `address1` varchar(255) NOT NULL,
  `address2` varchar(255) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_sa_customer_idx` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

**用途**: 顧客の配送先アドレス帳

### 既存テーブルの互換性確認

#### `quotes` テーブル

- **管理用フロントエンド**: `id` が `VARCHAR(255)`
- **ウェブサイト**: `quote_code` を使用（`id` は `INT AUTO_INCREMENT`）

**対応方法**: `quote_code` を使用して互換性を確保

---

## APIエンドポイントの統合

### 追加が必要なAPI

#### 1. マジックリンク認証API

**`api/login-request.php`**
- メールアドレスを受け取り、ワンタイムトークンを生成
- メールでログインリンクを送信

**`api/login-verify.php`**
- トークンを検証
- JWTセッショントークンを発行

#### 2. マイページデータAPI

**`api/my-page-data.php`**
- 認証された顧客の情報を取得
- 顧客情報、配送先アドレス、見積一覧、案件進行状況を返す

#### 3. 見積保存API

**`api/save_quote.php`**
- 顧客が作成した見積を保存
- 管理者に通知メールを送信

---

## フロントエンドコンポーネントの統合

### コンポーネント配置

```
src/features/website/
├── components/
│   ├── MyPage.tsx              # 顧客マイページ
│   ├── LoginPage.tsx           # ログインページ
│   ├── LoginCallbackPage.tsx   # ログインコールバック
│   ├── Estimator.tsx           # 見積作成（ウェブサイト用）
│   └── ...
├── pages/
│   └── WebsitePage.tsx         # ウェブサイトのメインページ
└── services/
    └── websiteApiService.ts    # ウェブサイト用APIサービス
```

### ルーティングの追加

```typescript
// src/core/config/Routes.tsx
<Route path="/website/*" element={<WebsiteApp />} />
```

### 認証システムの統合

既存の `AuthContext` にマジックリンク認証を追加：

```typescript
// マジックリンク認証用の関数を追加
const requestMagicLink = async (email: string) => {
  const response = await fetch('/api/login-request.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return await response.json();
};

const verifyMagicLink = async (token: string) => {
  const response = await fetch('/api/login-verify.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('authToken', data.sessionToken);
  }
  return data;
};
```

---

## 案件状況表示の統合

### データ取得の統合

`api/my-page-data.php` を拡張し、管理用フロントエンドの `quotes` テーブルからデータを取得：

```php
// 案件進行状況の取得
$stmt = $pdo->prepare("
    SELECT 
        q.*,
        (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) as totalItems
    FROM quotes q
    WHERE q.customer_id = ? 
    ORDER BY q.created_at DESC
");

// ステータス情報のマッピング
$mainStatus = '見積もり中';
if ($quote['quote_status'] === '受注') {
    $mainStatus = ($quote['shipping_status'] === '発送完了') ? '完了' : '製作中';
}

// ステップ情報の構築
$steps = [
    ['name' => '注文受付', 'status' => 'complete', 'date' => $quote['ordered_at']],
    ['name' => 'ご入金確認', 'status' => ($quote['payment_status'] === '入金済') ? 'complete' : 'upcoming'],
    ['name' => '作業中', 'status' => ($quote['production_status'] !== '未着手') ? 'current' : 'upcoming'],
    ['name' => '発送', 'status' => ($quote['shipping_status'] === '発送完了') ? 'complete' : 'upcoming'],
];
```

### 表示項目

顧客が閲覧できる案件情報：
- 見積ステータス
- 製作ステータス
- 入金状況
- 発送状況
- データ確認
- 希望納品日

---

## 見積作成機能の分離

### 見積作成（EstimatorPage）→ ウェブサイト用

**変更点**:
- 認証不要（または簡易認証）
- 顧客検索機能を削除
- 顧客新規登録機能を削除
- シンプルなUI
- 見積送信機能

### 見積作成V2（EstimatorPageV2）→ 管理用

**変更点**:
- 認証必須
- 顧客データベースから選択
- 高度な機能（編集、削除、帳票管理との連携）
- 複数の帳票タイプ対応

---

## 実装の優先順位

### フェーズ1: データベース統合（優先度：高）

1. `login_tokens` テーブルの追加
2. `shipping_addresses` テーブルの追加
3. 既存テーブルの互換性確認

### フェーズ2: APIエンドポイントの統合（優先度：高）

1. マジックリンク認証API
2. マイページデータAPI
3. 見積保存API

### フェーズ3: フロントエンドコンポーネントの統合（優先度：中）

1. ウェブサイトコンポーネントの配置
2. ルーティングの追加
3. 認証システムの統合

### フェーズ4: 機能統合（優先度：中）

1. 見積作成機能の分離
2. 案件状況表示の統合
3. PDF出力機能の統合

---

## 注意事項

- ウェブサイト統合は、管理用フロントエンドが正常に動作してから実施する
- データベース構造の統合は慎重に行う（既存データへの影響を考慮）
- 認証システムの統合は、セキュリティを最優先に考慮する
- 見積作成機能の分離は、既存機能への影響を最小限に抑える

---

## 関連ドキュメント

- `docs/WEBSITE_BUILDER_PLAN.md` - ウェブサイト構築ツールの計画
- `docs/ERROR_FIXES_SUMMARY.md` - エラー修正の詳細
- `docs/PRIORITY_TASKS.md` - 優先タスク一覧


