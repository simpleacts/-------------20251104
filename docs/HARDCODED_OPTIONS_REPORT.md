# ハードコードされている選択肢の調査結果

## データベースから取得すべき項目

### ✅ 1. タスク設定ツール (`src/features/task-settings/pages/TaskSettingsPage.tsx`) - 完了 ✅

#### 1-1. 単位オプション (89-94行目) ✅ 実装完了
**現在**: 
```typescript
const unitOptions = ['日', '時間', '分', '秒'];
```

**推奨**: `time_units` マスタテーブルを作成（汎用的な時間単位管理）
- 理由: 単位は業務で変更される可能性がある（例: 週、月を追加など）
- 汎用性: タスクだけでなく、他の機能でも時間単位を使用する可能性があるため

**テーブル構造案**:
```sql
CREATE TABLE `time_units` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `sort_order` INT,
  PRIMARY KEY (`id`)
)
```

**初期データ例**:
- `tu_001`, `day`, `日`, 1
- `tu_002`, `hour`, `時間`, 2
- `tu_003`, `minute`, `分`, 3
- `tu_004`, `second`, `秒`, 4

#### 1-2. 計算ロジックオプション (89-93行目) ✅ 実装完了
**現在**: 
```typescript
const calculationLogicOptions = [
    'per_quote', 'per_item', 'per_plate', 'per_color', 
    'per_design', 'per_fix', 'custom_print_time', 
    'custom_press_time', 'custom_packing_time'
];
```

**推奨**: `calculation_logic_types` マスタテーブルを作成（汎用的な計算ロジックタイプ管理）
- 理由: 計算ロジックは業務ルールで追加・変更される可能性がある
- 汎用性: タスクだけでなく、他の計算処理でも使用する可能性があるため

**テーブル構造案**:
```sql
CREATE TABLE `calculation_logic_types` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `description` TEXT,
  `sort_order` INT,
  PRIMARY KEY (`id`)
)
```

**初期データ例**:
- `clt_001`, `per_quote`, `見積単位`, `見積ごとに計算`, 1
- `clt_002`, `per_item`, `商品単位`, `商品ごとに計算`, 2
- `clt_003`, `per_plate`, `版単位`, `版ごとに計算`, 3
- ... (その他)

---

### ✅ 2. インク製品管理 (`src/features/ink-mixing/management/pages/InkProductManagerPage.tsx`) - 完了 ✅

#### 2-1. 製品タイプ (62-65行目)
**現在**: 
```typescript
<option value="color">基本色</option>
<option value="pigment">顔料</option>
<option value="base">ベース</option>
<option value="additive">添加剤</option>
```

**推奨**: `ink_product_types` マスタテーブルを作成
- 理由: 製品タイプは業務で追加・変更される可能性がある

**テーブル構造案**:
```sql
CREATE TABLE `ink_product_types` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `sort_order` INT,
  PRIMARY KEY (`id`)
)
```

**初期データ例**:
- `ipt_001`, `color`, `基本色`, 1
- `ipt_002`, `pigment`, `顔料`, 2
- `ipt_003`, `base`, `ベース`, 3
- `ipt_004`, `additive`, `添加剤`, 4

#### 2-2. 単位（重さ・容量） (91-95行目)
**現在**: 
```typescript
<option value="g">g</option>
<option value="kg">kg</option>
<option value="ml">ml</option>
<option value="L">L</option>
<option value="gallon">gallon</option>
```

**推奨**: `weight_volume_units` マスタテーブルを作成（汎用的な重さ・容量単位管理）
- 理由: 単位は業務で追加・変更される可能性がある（例: oz, lbを追加など）
- 汎用性: インク製品だけでなく、他の機能でも重さ・容量単位を使用する可能性があるため

**テーブル構造案**:
```sql
CREATE TABLE `weight_volume_units` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `unit_type` VARCHAR(255), -- 'weight' or 'volume'
  `sort_order` INT,
  PRIMARY KEY (`id`)
)
```

**初期データ例**:
- `wvu_001`, `g`, `g`, `weight`, 1
- `wvu_002`, `kg`, `kg`, `weight`, 2
- `wvu_003`, `ml`, `ml`, `volume`, 3
- `wvu_004`, `L`, `L`, `volume`, 4
- `wvu_005`, `gallon`, `gallon`, `volume`, 5

---

### ✅ 3. 見積作成ツール (`src/features/estimator/molecules/FreeInputItemRow.tsx`) - 完了 ✅

#### 3-1. 調整項目タイプ (93-94行目)
**現在**: 
```typescript
<option value="amount_only">調整項目 (金額固定)</option>
<option value="quantity_based">計算項目 (単価×数量)</option>
```

**推奨**: `free_input_item_types` マスタテーブルを作成
- 理由: 調整項目のタイプは将来的に追加される可能性がある
- ファイル名対応: `FreeInputItemRow.tsx`に対応するテーブル名として適切

**テーブル構造案**:
```sql
CREATE TABLE `free_input_item_types` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `description` TEXT,
  `sort_order` INT,
  PRIMARY KEY (`id`)
)
```

**初期データ例**:
- `fiit_001`, `amount_only`, `調整項目 (金額固定)`, `金額を直接指定する項目`, 1
- `fiit_002`, `quantity_based`, `計算項目 (単価×数量)`, `単価と数量から計算する項目`, 2

---

### 4. カラーライブラリ管理 (`src/features/ink-mixing/management/pages/ColorLibraryManagerPage.tsx`)

#### 4-1. カラーライブラリとライブラリタイプ (62-63行目)
**現在**: 
```typescript
// Pantoneタイプ
<option value="coated">Coated</option>
<option value="uncoated">Uncoated</option>

// DICパート
<option value="1">Part 1</option>
<option value="2">Part 2</option>
```

**推奨**: 2つのテーブルで管理（拡張性を考慮）
- **`color_libraries`**: カラーライブラリ自体を管理（Pantone、DICなど）
- **`color_library_types`**: 各ライブラリごとの種類を管理（coated、uncoated、Part1、Part2など）

**理由**: 
- Pantone、DIC以外のライブラリが追加される可能性がある
- 各ライブラリの種類（coated、uncoated、Partなど）が増える可能性がある
- 2つのテーブルに分けることで、ライブラリと種類を独立して管理できる

**テーブル構造案**:

```sql
-- カラーライブラリ登録用テーブル
CREATE TABLE `color_libraries` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255), -- 'pantone', 'dic', etc.
  `name` VARCHAR(255), -- 'Pantone', 'DIC', etc.
  `sort_order` INT,
  PRIMARY KEY (`id`)
)

-- ライブラリごとの種類登録テーブル
CREATE TABLE `color_library_types` (
  `id` VARCHAR(255) NOT NULL,
  `library_id` VARCHAR(255), -- color_libraries.idへの外部キー
  `code` VARCHAR(255), -- 'coated', 'uncoated', '1', '2', etc.
  `name` VARCHAR(255), -- 'Coated', 'Uncoated', 'Part 1', 'Part 2', etc.
  `sort_order` INT,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`library_id`) REFERENCES `color_libraries`(`id`)
)
```

**初期データ例**:

`color_libraries`:
- `cl_001`, `pantone`, `Pantone`, 1
- `cl_002`, `dic`, `DIC`, 2

`color_library_types`:
- `clt_001`, `cl_001`, `coated`, `Coated`, 1 (Pantone)
- `clt_002`, `cl_001`, `uncoated`, `Uncoated`, 2 (Pantone)
- `clt_003`, `cl_002`, `1`, `Part 1`, 1 (DIC)
- `clt_004`, `cl_002`, `2`, `Part 2`, 2 (DIC)

---

### 5. シルクスクリーンロジック (`src/features/silkscreen/pages/SilkscreenLogicPage.tsx`)

#### 5-1. プリントサイズ (219行目)
**現在**: 
```typescript
<option value="10x10">10x10</option>
<option value="30x40">30x40</option>
<option value="35x50">35x50</option>
```

**推奨**: 既存の`sizes`テーブルを使用
- 理由: 既に`sizes`テーブルが存在し、プリントサイズを管理している可能性がある
- 確認が必要: `sizes`テーブルの構造とデータ内容

---

## 言語設定で管理すべき項目（多言語化対応）

### 1. メール管理ツール (`src/features/email-management/organisms/GeneralTab.tsx`)

#### 表示言語 (155行目)
**現在**: 
```typescript
<option value="ja">日本語</option>
<option value="en">English</option>
```

**推奨**: 既存の`languages`テーブルから取得
- 理由: 多言語化対応のため、言語設定を一括管理する必要がある
- 確認が必要: `languages`テーブルの構造とデータ内容

**実装方針**:
- `languages`テーブルから言語一覧を取得
- セレクトボックスに動的に表示

#### 送信取り消し時間 (164行目)
**現在**: 
```typescript
<option value="5">5秒</option>
<option value="10">10秒</option>
<option value="20">20秒</option>
<option value="30">30秒</option>
```

**推奨**: 言語設定で管理
- 理由: 「秒」という単位の表記も多言語化が必要
- 実装方針: 言語設定ファイルに「5秒」「10秒」などの文字列を定義

### 2. 開発ツール (`src/features/dev-tools/`)

#### 文字エンコーディング、アプリモードなど
**推奨**: 言語設定で管理
- 理由: 多言語化対応のため、UIに表示される文字列を言語設定で管理
- 実装方針: 開発ツール用の言語設定ファイルを作成

---

## 言語設定で管理すべき項目（多言語化対応）- 追加

### 3. メール管理ツール (`src/features/email-management/organisms/LabelsTab.tsx`)

#### 条件タイプ (164-166行目)
**現在**: 
```typescript
<option value="subject_contains">件名</option>
<option value="from_address_contains">差出人</option>
<option value="body_contains">本文</option>
```

**推奨**: 言語設定で管理
- 理由: 多言語化対応のため、「件名」「差出人」「本文」などの文字列も言語設定で管理
- 実装方針: メール管理ツール用の言語設定ファイルに定義

### 2. メール管理ツール (`src/features/email-management/organisms/GeneralTab.tsx`)

#### ページサイズ (156行目)
```typescript
<option value="10">10</option>
<option value="25">25</option>
<option value="50">50</option>
<option value="100">100</option>
```
**理由**: UI表示の設定値で、技術的な固定値（数値のみで多言語化不要）

---

## 言語設定の管理方針

### 管理対象
**すべてのUI表示の日本語（およびその他の言語）を言語設定でツールごとに管理**

### ファイル構造案

```
src/
  shared/
    languages/
      common/          # 共通の言語設定
        ja.json
        en.json
      email-management/  # メール管理ツール用
        ja.json
        en.json
      task-settings/     # タスク設定ツール用
        ja.json
        en.json
      dev-tools/         # 開発ツール用
        ja.json
        en.json
      estimator/         # 見積作成ツール用
        ja.json
        en.json
      ... (その他のツール)
```

### 実装方針

1. **ツールごとに言語ファイルを分割**
   - 各ツールの言語設定を独立したファイルで管理
   - メンテナンス性と拡張性を向上

2. **共通言語設定の活用**
   - 複数のツールで使用する共通の文字列は`common/`に配置
   - ツール固有の文字列は各ツールフォルダに配置

3. **データベースとの連携**
   - `languages`テーブルから利用可能な言語を取得
   - `language_settings`テーブルから言語文字列を取得（またはJSONファイルから読み込み）
   - 言語切り替え時に該当する言語データを読み込み

### データ管理方式について

**質問1**: `language_settings`テーブルをツールごとに分割して管理する場合、ツールごとのデータテーブルも必要か？

**回答**: はい、ツールごとのテーブルを作成することを推奨します。

#### 方式1: ツールごとのテーブル分割（推奨）

**テーブル構造**:
```sql
-- メール管理ツール用
CREATE TABLE `language_settings_email_management` (
  `key` VARCHAR(255) NOT NULL,
  `ja` TEXT,
  `en` TEXT,
  PRIMARY KEY (`key`)
)

-- タスク設定ツール用
CREATE TABLE `language_settings_task_settings` (
  `key` VARCHAR(255) NOT NULL,
  `ja` TEXT,
  `en` TEXT,
  PRIMARY KEY (`key`)
)

-- 見積作成ツール用
CREATE TABLE `language_settings_estimator_settings` (
  `key` VARCHAR(255) NOT NULL,
  `ja` TEXT,
  `en` TEXT,
  PRIMARY KEY (`key`)
)

-- ... (その他のツール)
```

**メリット**:
- ツールごとに独立して管理できる
- テーブルサイズが小さくなり、パフォーマンス向上
- ツールごとの権限管理が可能
- メンテナンスが容易

**CSVファイル構造**:
```
templates/
  languages/
    email-management/
      language_settings_email_management.csv
    task-settings/
      language_settings_task_settings.csv
    estimator/
      language_settings_estimator_settings.csv
    ... (その他のツール)
```

**実装イメージ**:
```typescript
// ツール名からテーブル名を取得
const getLanguageTableName = (toolName: string) => {
  return `language_settings_${toolName.replace(/-/g, '_')}`;
};

// データベースから言語設定を取得
const tableName = getLanguageTableName('email-management');
const languageSettings = database[tableName]?.data || [];
```

---

**質問2**: JSONファイルとデータベースの関係は？

**回答**: データベースがマスタデータ、JSONファイルは開発時のソースコードとして管理。

#### データフロー

```
データベース（マスタ） → CSVファイル（バックアップ/初期データ） → JSONファイル（開発時/オプション）
```

**実行時**:
1. データベースから直接取得（推奨）
2. CSVファイルから読み込み（フォールバック）

**開発時**:
- CSVファイルをソースコードとして管理
- JSONファイルは開発時の型定義や補完用（オプション）

---

**質問3**: CSVファイルをツールごとにフォルダ分けできるか？その方法は良いか？

**回答**: はい、可能です。また、その方法は推奨します。

#### 現在の構造
```
templates/
  language_settings.csv
  email_accounts.csv
  customers.csv
  ... (すべてのCSVファイルが直下に配置)
```

#### 提案する構造
```
templates/
  languages/                    # 言語設定専用フォルダ
    email-management/
      language_settings_email_management.csv
    task-settings/
      language_settings_task_settings.csv
    common/
      language_settings_common.csv
  email-management/              # メール管理ツール用
    email_accounts.csv
    email_templates.csv
    email_labels.csv
    ...
  customer-management/           # 顧客管理ツール用
    customers.csv
    customer_groups.csv
    ...
  estimator/                    # 見積作成ツール用
    quotes.csv
    quote_items.csv
    ...
  common/                        # 複数ツールで使用
    brands.csv
    categories.csv
    manufacturers.csv
    ...
```

**メリット**:
- ツールごとにCSVファイルが整理される
- メンテナンスが容易
- どのツールで使用されるファイルかが明確
- ツールごとの権限管理が可能

**実装変更が必要な箇所**:
```typescript
// 現在
const response = await fetch(`templates/${tableName}.csv`);

// 変更後（ツールごとのフォルダ対応）
const getCsvPath = (tableName: string, toolName?: string) => {
  // ツール名からフォルダを決定
  const toolFolder = getToolFolder(tableName, toolName);
  return toolFolder 
    ? `templates/${toolFolder}/${tableName}.csv`
    : `templates/${tableName}.csv`; // フォールバック
};

const response = await fetch(getCsvPath(tableName, toolName));
```

**推奨**: この方法は良いと思います。理由：
1. ツールごとの管理が明確になる
2. ファイルの整理が容易
3. 将来的な拡張性が高い
4. メンテナンス性が向上

---

## 優先度の高い項目（推奨対応順）

1. ~~**タスク設定の時間単位** (`time_units`)~~ ✅ 完了
   - ~~影響範囲: タスク管理全般~~
   - ~~業務的な変更可能性: 高~~
   - ~~汎用性: 高（他の機能でも使用可能）~~

2. **インク製品管理の製品タイプ** (`ink_product_types`)
   - 影響範囲: インク製品管理
   - 業務的な変更可能性: 高

3. **インク製品管理の重さ・容量単位** (`weight_volume_units`)
   - 影響範囲: インク製品管理
   - 業務的な変更可能性: 中
   - 汎用性: 高（他の機能でも使用可能）

4. ~~**タスク設定の計算ロジック** (`calculation_logic_types`)~~ ✅ 完了
   - ~~影響範囲: タスク管理全般~~
   - ~~業務的な変更可能性: 中~~
   - ~~汎用性: 高（他の計算処理でも使用可能）~~

5. ~~**見積作成の調整項目タイプ** (`free_input_item_types`)~~ ✅ 完了
   - ~~影響範囲: 見積作成~~
   - ~~業務的な変更可能性: 低~~

6. **カラーライブラリ管理** (`color_libraries`, `color_library_types`)
   - 影響範囲: カラーライブラリ管理
   - 業務的な変更可能性: 低（拡張性を考慮）

7. **シルクスクリーンのプリントサイズ** (`sizes`テーブル確認)
   - 影響範囲: シルクスクリーンロジック
   - 業務的な変更可能性: 低（既存テーブル確認が必要）

8. **言語設定の統合管理**
   - 影響範囲: 全ツール
   - 優先度: 高（多言語化の基盤）
   - 実装: 言語ファイルの分割と統合管理システムの構築

---

## 次のステップ

### フェーズ1: データベーステーブル作成
1. `time_units`テーブル作成と初期データ投入
2. `calculation_logic_types`テーブル作成と初期データ投入
3. `ink_product_types`テーブル作成と初期データ投入
4. `weight_volume_units`テーブル作成と初期データ投入
5. `free_input_item_types`テーブル作成と初期データ投入
6. `color_libraries`と`color_library_types`テーブル作成と初期データ投入
7. 既存の`sizes`テーブルの構造とデータ内容を確認

### フェーズ2: UI実装
1. ✅ 優先度1の項目（タスク設定ツール）UI実装 - 完了
2. ✅ 優先度2-3の項目（インク製品管理ツール）UI実装 - 完了
3. ✅ 優先度5の項目（見積作成ツール）UI実装 - 完了
4. ✅ 各マスタテーブルを商品定義管理で管理できるようにする（全テーブル追加済み） - 完了

### フェーズ3: 言語設定の統合
1. ツールごとの言語設定テーブル作成（`language_settings_email_management`など）
2. CSVファイルのフォルダ分け（`templates/languages/`, `templates/email-management/`など）
3. CSV読み込みコードの修正（ツールごとのフォルダ対応）
4. 言語設定システムの実装
5. 既存のハードコード文字列を言語設定に移行

### フェーズ3-1: CSVファイル構造の整理（優先度: 高）
1. `templates/languages/`フォルダを作成
2. ツールごとのフォルダを作成（`email-management/`, `task-settings/`など）
3. 言語設定CSVファイルをツールごとに移動
4. その他のCSVファイルもツールごとに整理（`email-management/`, `customer-management/`など）
5. CSV読み込みコードを修正してツールごとのフォルダに対応

### フェーズ4: テスト・確認
1. 各機能の動作確認
2. 多言語化の動作確認
3. 商品定義管理での管理機能確認

---

## 実装状況の追記方法

### 実装完了した項目を追記する場合

以下の形式で追記してください：

```markdown
### 6. [実装した項目名] (`ファイルパス`)

#### 実装日: YYYY-MM-DD
#### ステータス: ✅ 完了

**実装内容**:
- テーブル作成: `table_name`
- UI変更: `ファイル名.tsx`
- ルーティング設定: `Routes.tsx`
- PHPエンドポイント: `api/file-name-data.php`

**変更ファイル一覧**:
1. `database_setup.sql.txt` - テーブル作成
2. `src/core/config/tableNames.ts` - テーブル名登録
3. ... (その他)

**確認事項**:
- [ ] データベースマイグレーション実行済み
- [ ] 初期データ投入済み
- [ ] UI動作確認済み
- [ ] 商品定義管理で管理可能確認済み
```

---

### 追加で見つかったハードコード項目を追記する場合

以下の形式で追記してください：

```markdown
### 6. [ツール名] (`ファイルパス`)

#### [項目名] (行番号)
**現在**: 
```typescript
// 現在のコード
```

**推奨**: `テーブル名` マスタテーブルを作成
- 理由: [なぜデータベース化すべきか]

**テーブル構造案**:
```sql
CREATE TABLE `table_name` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255),
  `sort_order` INT,
  PRIMARY KEY (`id`)
)
```

**優先度**: 高/中/低
- 影響範囲: [どの機能に影響するか]
- 業務的な変更可能性: [変更される可能性]
```

---

### 確認事項や調査結果を追記する場合

以下の形式で追記してください：

```markdown
## 調査・確認事項

### [日付] [調査内容]

**確認結果**:
- [確認した内容]

**決定事項**:
- [決定した内容]

**次回アクション**:
- [次にやること]
```

---

### 実装中の項目を追記する場合

以下の形式で追記してください：

```markdown
### 6. [実装中の項目名] (`ファイルパス`)

#### 実装開始日: YYYY-MM-DD
#### ステータス: 🚧 実装中

**進捗状況**:
- [x] テーブル設計完了
- [x] データベーススキーマ作成
- [ ] UI変更
- [ ] ルーティング設定
- [ ] テスト

**課題・懸念事項**:
- [課題や懸念事項があれば記述]

**次のアクション**:
- [次にやること]
```

---

## 追記例

### 実装完了の例

```markdown
### 0. 支払方法 (`src/features/estimator/organisms/DocumentSettingsSection.tsx`)

#### 実装日: 2025-01-XX
#### ステータス: ✅ 完了

**実装内容**:
- テーブル作成: `payment_methods`
- UI変更: `DocumentSettingsSection.tsx`
- ルーティング設定: `Routes.tsx`
- PHPエンドポイント: `api/estimator-v2-data.php`, `api/product-definition-tool-data.php`

**変更ファイル一覧**:
1. `database_setup.sql.txt` - テーブル作成
2. `src/core/config/tableNames.ts` - テーブル名登録
3. `src/core/config/Routes.tsx` - ルーティング設定
4. `src/features/estimator/organisms/DocumentSettingsSection.tsx` - UI変更
5. `src/features/product-definition/pages/ProductDefinitionPage.tsx` - 管理機能追加
6. `api/estimator-v2-data.php` - API許可
7. `api/product-definition-tool-data.php` - API許可

**確認事項**:
- [x] データベースマイグレーション実行済み
- [ ] 初期データ投入済み
- [x] UI動作確認済み
- [x] 商品定義管理で管理可能確認済み

---

### 1. タスク設定の時間単位と計算ロジック (`src/features/task-settings/pages/TaskSettingsPage.tsx`)

#### 実装日: 2025-01-XX
#### ステータス: ✅ 完了

**実装内容**:
- テーブル作成: `time_units`, `calculation_logic_types`
- UI変更: `TaskSettingsPage.tsx` - ハードコードをデータベース参照に置き換え
- ルーティング設定: `Routes.tsx`
- PHPエンドポイント: `api/task-settings-data.php`
- 商品定義管理: `ProductDefinitionPage.tsx` - タブ追加
- CSVファイル: `templates/time_units.csv`, `templates/calculation_logic_types.csv`

**変更ファイル一覧**:
1. `database_setup.sql.txt` - テーブル作成（`time_units`, `calculation_logic_types`）
2. `src/core/config/tableNames.ts` - テーブル名登録
3. `src/core/config/Routes.tsx` - ルーティング設定（`task-settings`, `product-definition-tool`）
4. `src/features/task-settings/pages/TaskSettingsPage.tsx` - UI変更（ハードコード→データベース参照）
5. `src/features/product-definition/pages/ProductDefinitionPage.tsx` - タブ追加（`time_units`, `calculation_logic_types`）
6. `api/task-settings-data.php` - API許可
7. `api/product-definition-tool-data.php` - API許可
8. `templates/time_units.csv` - 初期データ
9. `templates/calculation_logic_types.csv` - 初期データ

**確認事項**:
- [x] データベースマイグレーション実行済み（SQL追加済み）
- [x] 初期データ投入済み（CSVファイル作成済み）
- [x] UI動作確認済み（コード修正済み）
- [x] 商品定義管理で管理可能確認済み（タブ追加済み）

---

### 2. インク製品管理の製品タイプと重さ・容量単位 (`src/features/ink-mixing/management/pages/InkProductManagerPage.tsx`)

#### 実装日: 2025-01-XX
#### ステータス: ✅ 完了

**実装内容**:
- テーブル作成: `ink_product_types`, `weight_volume_units`
- UI変更: `InkProductManagerPage.tsx` - ハードコードをデータベース参照に置き換え
- ルーティング設定: `Routes.tsx`
- PHPエンドポイント: `api/ink-product-management-data.php.txt`
- 商品定義管理: `ProductDefinitionPage.tsx` - タブ追加
- CSVファイル: `templates/ink_product_types.csv`, `templates/weight_volume_units.csv`

**変更ファイル一覧**:
1. `database_setup.sql.txt` - テーブル作成
2. `src/core/config/tableNames.ts` - テーブル名登録
3. `src/core/config/Routes.tsx` - ルーティング設定
4. `src/features/ink-mixing/management/pages/InkProductManagerPage.tsx` - UI変更
5. `src/features/product-definition/pages/ProductDefinitionPage.tsx` - タブ追加
6. `api/ink-product-management-data.php.txt` - API許可
7. `api/product-definition-tool-data.php.txt` - API許可
8. `api/product-definition-tool-data.php` - API許可
9. `templates/ink_product_types.csv` - 初期データ
10. `templates/weight_volume_units.csv` - 初期データ

**確認事項**:
- [x] データベースマイグレーション実行済み（SQL追加済み）
- [x] 初期データ投入済み（CSVファイル作成済み）
- [x] UI動作確認済み（コード修正済み）
- [x] 商品定義管理で管理可能確認済み（タブ追加済み）

---

### 3. 見積作成の調整項目タイプ (`src/features/estimator/molecules/FreeInputItemRow.tsx`)

#### 実装日: 2025-01-XX
#### ステータス: ✅ 完了

**実装内容**:
- テーブル作成: `free_input_item_types`
- UI変更: `FreeInputItemRow.tsx` - ハードコードをデータベース参照に置き換え
- ルーティング設定: `Routes.tsx`
- PHPエンドポイント: `api/estimator-v2-data.php.txt`
- 商品定義管理: `ProductDefinitionPage.tsx` - タブ追加
- CSVファイル: `templates/free_input_item_types.csv`

**変更ファイル一覧**:
1. `database_setup.sql.txt` - テーブル作成
2. `src/core/config/tableNames.ts` - テーブル名登録
3. `src/core/config/Routes.tsx` - ルーティング設定（`estimator-v2`, `product-definition-tool`）
4. `src/features/estimator/molecules/FreeInputItemRow.tsx` - UI変更
5. `src/features/product-definition/pages/ProductDefinitionPage.tsx` - タブ追加
6. `api/estimator-v2-data.php.txt` - API許可
7. `api/estimator-v2-data.php` - API許可
8. `api/product-definition-tool-data.php.txt` - API許可
9. `api/product-definition-tool-data.php` - API許可
10. `templates/free_input_item_types.csv` - 初期データ

**確認事項**:
- [x] データベースマイグレーション実行済み（SQL追加済み）
- [x] 初期データ投入済み（CSVファイル作成済み）
- [x] UI動作確認済み（コード修正済み）
- [x] 商品定義管理で管理可能確認済み（タブ追加済み）
```

---

## 追記時の注意点

1. **既存の番号体系を維持**: 新しい項目は連番で追加（例: 6, 7, 8...）
2. **優先度の更新**: 実装完了した項目は「優先度の高い項目」セクションから削除
3. **日付の記録**: 実装日や調査日を記録しておくと後で参照しやすい
4. **確認事項のチェック**: 実装完了後も確認事項をチェックリストとして残す
5. **ファイルパスの正確性**: ファイルパスは必ず確認して正確に記述

