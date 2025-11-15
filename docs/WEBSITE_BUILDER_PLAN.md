# ウェブサイト構築ツールの計画

## 概要

既存のウェブサイト（`nassenbrothers_website`）をテンプレート化し、複数のサイトを管理・構築できるツールを実装する計画です。

## 現在のウェブサイトの構造

### 確認済みの主要機能

1. **マジックリンク認証**
   - `login-request.php`: メール送信
   - `login-verify.php`: トークン検証・JWT発行
   - `login_tokens` テーブル

2. **顧客マイページ（MyPage.tsx）**
   - 顧客情報管理
   - 配送先アドレス帳（`shipping_addresses` テーブル）
   - 見積一覧・編集
   - 案件進行状況表示（見積ステータス、製作ステータス、入金状況、発送状況、データ確認、希望納品日）
   - PDF出力（見積書、納品書、請求書、領収書）

3. **見積作成機能（Estimator.tsx）**
   - 顧客が自分で見積を作成
   - 見積保存（`save_quote.php`）

4. **データベース構造**
   - `quotes` テーブル: 管理用よりシンプル（`id` が `INT AUTO_INCREMENT`）
   - `customers` テーブル: 基本情報のみ
   - `shipping_addresses` テーブル: 配送先アドレス帳
   - `login_tokens` テーブル: マジックリンク認証用

### テンプレート化可能な要素

1. **テーマ設定（`theme_settings.csv`）**
   - 色、フォント、レイアウト設定
   - 現在は `ThemeEditor.tsx` で編集可能

2. **UIテキスト（`ui_text.csv`）**
   - 表示文言の管理
   - 現在は `UiTextEditor.tsx` で編集可能

3. **ページコンテンツ（`pages_content.json`）**
   - 静的ページの構造
   - 現在は `StaticPageEditor.tsx` で編集可能

4. **コンポーネント構造**
   - Reactコンポーネント（Estimator, MyPage, HomePageなど）
   - 再利用可能な構造

---

## 統合方針

### 方針1: 管理用フロントエンド内に統合（推奨）

既存のウェブサイトを管理用フロントエンドの機能として統合し、複数のサイトを管理できるようにする。

**メリット**:
- 統一された技術スタック（React + TypeScript）
- データベースとの連携が容易
- 既存の管理機能を活用可能

**デメリット**:
- 統合作業が必要
- 既存コードの理解が必要

---

## データベース構造の設計

### サイト管理テーブル

```sql
-- サイト一覧テーブル
CREATE TABLE `websites` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `domain` VARCHAR(255),
  `description` TEXT,
  `template_id` VARCHAR(255),  -- 使用しているテンプレートID
  `status` VARCHAR(50) DEFAULT 'draft',  -- draft, published, archived
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- テンプレート一覧テーブル
CREATE TABLE `website_templates` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(100),  -- 'tshirt-shop', 'e-commerce', 'portfolio' など
  `preview_image_url` VARCHAR(500),
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- サイトごとのテーマ設定テーブル
CREATE TABLE `website_theme_settings` (
  `id` VARCHAR(255) NOT NULL,
  `website_id` VARCHAR(255) NOT NULL,
  `setting_key` VARCHAR(255) NOT NULL,
  `setting_value` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_website_setting` (`website_id`, `setting_key`),
  KEY `fk_website_theme_website` (`website_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- サイトごとのUIテキストテーブル
CREATE TABLE `website_ui_texts` (
  `id` VARCHAR(255) NOT NULL,
  `website_id` VARCHAR(255) NOT NULL,
  `text_key` VARCHAR(255) NOT NULL,
  `text_value` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_website_text` (`website_id`, `text_key`),
  KEY `fk_website_ui_website` (`website_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- サイトごとのページコンテンツテーブル
CREATE TABLE `website_pages_content` (
  `id` VARCHAR(255) NOT NULL,
  `website_id` VARCHAR(255) NOT NULL,
  `page_key` VARCHAR(255) NOT NULL,
  `content_json` JSON,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_website_page` (`website_id`, `page_key`),
  KEY `fk_website_pages_website` (`website_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### 既存テーブルの追加

```sql
-- マジックリンク認証用テーブル（既存のウェブサイトから）
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

-- 配送先アドレス帳テーブル（既存のウェブサイトから）
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

---

## ウェブサイト構築ツールの機能設計

### ディレクトリ構造

```
src/features/website-builder/
├── pages/
│   ├── WebsiteListPage.tsx        # サイト一覧
│   ├── WebsiteEditorPage.tsx      # サイト編集
│   └── WebsiteBuilderPage.tsx      # サイト構築（テンプレート選択）
├── components/
│   ├── TemplateSelector.tsx        # テンプレート選択
│   ├── SiteSettingsEditor.tsx      # サイト設定編集
│   ├── ThemeEditor.tsx             # テーマ編集（既存を拡張）
│   ├── ContentEditor.tsx            # コンテンツ編集
│   └── BuildOutput.tsx             # ビルド出力
└── services/
    └── websiteBuilderService.ts    # サイト構築API
```

### 主要機能

#### 1. サイト一覧ページ

- 作成済みサイトの一覧表示
- サイトの作成・編集・削除
- サイトの公開状態管理

#### 2. テンプレート選択

- 既存テンプレートから選択
- テンプレートのプレビュー表示
- テンプレートの詳細情報表示

#### 3. サイト編集機能

- **サイト設定**: サイト名、ドメイン、説明
- **テーマ編集**: 色、フォント、レイアウト
- **UIテキスト編集**: 表示文言
- **ページコンテンツ編集**: 静的ページの内容
- **商品データ**: サイトごとに異なる商品を設定可能

#### 4. ビルド・出力機能

- 完成したサイトを静的ファイルとして出力
- ZIPファイルとしてダウンロード
- 必要に応じてサーバーにデプロイ

---

## テンプレート化の実装方法

### ステップ1: 既存サイトをテンプレート化

1. `nassenbrothers_website` をテンプレートとして保存
2. テーマ設定、UIテキスト、ページコンテンツをテンプレートとして登録
3. テンプレートIDを生成してデータベースに保存

### ステップ2: テンプレートからサイト作成

```typescript
// websiteBuilderService.ts
export const createSiteFromTemplate = async (
  templateId: string,
  siteName: string,
  siteDomain?: string
) => {
  // 1. テンプレートの設定を取得
  const template = await fetchTemplate(templateId);
  
  // 2. 新しいサイトを作成
  const siteId = generateId();
  await createWebsite({
    id: siteId,
    name: siteName,
    domain: siteDomain,
    template_id: templateId,
    status: 'draft'
  });
  
  // 3. テンプレートの設定をサイトにコピー
  await copyTemplateSettings(templateId, siteId);
  
  return siteId;
};

const copyTemplateSettings = async (
  templateId: string,
  siteId: string
) => {
  // テーマ設定をコピー
  const themeSettings = await fetchTemplateThemeSettings(templateId);
  await saveSiteThemeSettings(siteId, themeSettings);
  
  // UIテキストをコピー
  const uiTexts = await fetchTemplateUiTexts(templateId);
  await saveSiteUiTexts(siteId, uiTexts);
  
  // ページコンテンツをコピー
  const pagesContent = await fetchTemplatePagesContent(templateId);
  await saveSitePagesContent(siteId, pagesContent);
};
```

---

## 統合の優先順位

### フェーズ1: データベース統合（優先度：高）

1. `login_tokens` テーブルの追加
2. `shipping_addresses` テーブルの追加
3. サイト管理テーブルの作成

### フェーズ2: APIエンドポイントの統合（優先度：高）

1. マジックリンク認証API（`login-request.php`, `login-verify.php`）
2. マイページデータAPI（`my-page-data.php`）
3. 見積保存API（`save_quote.php`）

### フェーズ3: フロントエンドコンポーネントの統合（優先度：中）

1. ウェブサイトコンポーネントの配置
2. ルーティングの追加
3. 認証システムの統合

### フェーズ4: ウェブサイト構築ツールの実装（優先度：低）

1. サイト一覧ページの作成
2. テンプレート選択機能
3. サイト編集機能
4. ビルド・出力機能

---

## 見積作成機能の分離方針

### 見積作成（EstimatorPage）→ ウェブサイト用に最適化

**変更点**:
- 認証不要（または簡易認証）
- 顧客検索機能を削除（顧客は自分で情報を入力）
- 顧客新規登録機能を削除（入力フォームのみ）
- シンプルなUI（管理機能を非表示）
- 見積送信機能（管理者に通知・保存）

### 見積作成V2（EstimatorPageV2）→ 管理用フロントエンド専用

**変更点**:
- 認証必須
- 顧客データベースから選択
- 高度な機能（編集、削除、帳票管理との連携）
- 複数の帳票タイプ（見積書、請求書、納品書、領収書）

---

## ビルド・出力機能

### ビルド出力の構造

```
dist/websites/
├── site-001/
│   ├── index.html
│   ├── main.js
│   ├── assets/
│   └── ...
├── site-002/
│   ├── index.html
│   ├── main.js
│   └── ...
└── ...
```

### ビルド機能の実装

```typescript
// BuildOutput.tsx
export const buildWebsite = async (websiteId: string) => {
  // 1. サイトの設定を取得
  const website = await fetchWebsite(websiteId);
  const themeSettings = await fetchSiteThemeSettings(websiteId);
  const uiTexts = await fetchSiteUiTexts(websiteId);
  const pagesContent = await fetchSitePagesContent(websiteId);
  
  // 2. 静的ファイルを生成
  const staticFiles = generateStaticFiles({
    website,
    themeSettings,
    uiTexts,
    pagesContent
  });
  
  // 3. ZIPファイルとして出力
  const zipFile = await createZipFile(staticFiles);
  
  // 4. ダウンロードまたはサーバーにデプロイ
  return zipFile;
};
```

---

## メリット

1. **テンプレート再利用**: 同じ構造を複数のサイトで利用可能
2. **個別カスタマイズ**: 各サイトでテーマ、UIテキスト、コンテンツを変更可能
3. **独立ビルド**: 各サイトを個別にビルドして出力可能
4. **一元管理**: 管理用フロントエンドから複数のサイトを管理可能

---

## 注意事項

- ウェブサイト構築ツールの実装は、管理用フロントエンドが正常に動作してから実施する
- 既存のウェブサイト（`nassenbrothers_website`）は、テンプレートとして活用する
- データベース構造の統合は慎重に行う（既存データへの影響を考慮）
- ビルド機能は、完成したサイトを個別に出力できるようにする

---

## 関連ドキュメント

- `docs/ERROR_FIXES_SUMMARY.md` - エラー修正の詳細
- `docs/FILE_PATH_MANAGEMENT.md` - ファイルパス管理の改善計画
- `docs/PRIORITY_TASKS.md` - 優先タスク一覧


