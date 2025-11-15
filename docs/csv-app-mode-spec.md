## CSV書き込みモード運用仕様

### 1. アプリ動作モードと責務
- `live`  
  - すべての読み書きをPHP API経由で実DBに対して実行。  
  - 参照: `/api/*-data.php`, `/api/update-data.php`, `/api/alter-table.php` など。
- `csv-debug`  
  - 読み込み専用。`fetchTables()` が `templates/**.csv` からデータとスキーマをロード。  
  - 書き込み系APIは無効化し、UIからの更新操作は抑止する。
- `csv-writable`  
  - 参照は `csv-debug` と同じくCSVから。  
  - 更新時は `setDatabase()` が差分を検知し `/api/save-csv.php` へPOST → CSVを上書き。  
  - PHPの更新APIは呼ばず、フロントエンド内で完結させる。  
  - このモードのCSVが「真実のソース」となり、後段でSQLを自動生成する。

### 2. 依存テーブルの扱い
- `tool_dependencies.csv`（および `Routes.tsx` のフォールバック定義）は各ツールが起動時に読み込むテーブルを示す。  
- CSV書き込みモードでは、ここに記載のテーブルのみが `database` コンテキストへロードされるため、最新のテーブル名と一致していないとツール側でデータが空になる。  
- 対応方針  
  1. CSVファイル群と同じ命名に統一（例: `language_settings_proofing` など）。  
  2. `database-schema-manager` など後から追加したツールにも `tool_dependencies` を定義し、CSVモードでも必要テーブルがロードされるようにする。  
  3. `scripts/verify-csv-sql-consistency.js` に「CSV存在⇔tool_dependencies記載」を検証するチェックを追加。

### 3. 更新フローと AppMode 分岐
- **AppMode とは** `localStorage` に保存されているアプリ動作モード（`live` / `csv-debug` / `csv-writable`）で、`useAppDataInitialization` と `DatabaseContext` が参照している。
- 代表的な更新系ツールは以下の分岐を徹底する。
  - **Data-IO**: インポート/エクスポート時  
    - `live`: 既存のPHP APIを使用。  
    - `csv-writable`: CSV書き込みヘルパ（下記）で直接 `setDatabase` + `save-csv.php` を呼ぶ。
  - **Database Schema Manager**: スキーマ変更プレビュー（ALTER差分）  
    - `live`: `/api/alter-table.php` を呼んで実DBをALTER。  
    - `csv-writable`: 選択テーブルのスキーマを直接更新し、CSVに保存（ALTER SQLは生成のみ）。  
  - **Language Manager**: 言語設定CSVの編集  
    - `live`: `update-data.php`（settingsテーブル等）を利用。  
    - `csv-writable`: 対象 `language_settings_*` CSVを直接上書き。
- 共通ヘルパのイメージ  
  ```ts
  import { getAppMode } from '@core/utils/appMode';
  import { saveTableToCsv } from '@core/utils/csvSaveHelper';

  if (getAppMode() === 'csv-writable') {
      saveTableToCsv('language_settings_proofing', updatedRows);
  } else {
      await callPhpApi(...);
  }
  ```

### 4. CSV → SQL 自動エクスポート
- CSVが更新されたら `npm run export:setup-sql`（仮）で以下を実行する。
  1. `templates/**.csv` を走査し、ヘッダー情報とメタ定義から `CREATE TABLE` を生成 → `templates/database_setup.sql.txt` を再構築。  
  2. データ部分を `initial_data_setup_*.sql` に反映。  
  3. 生成物をGitにコミットしておくことで、DB初期化手順とCSVの差異がなくなる。
- 生成時には「未対応テーブル／欠落カラム」を検出し、CIで失敗させる。

### 5. CSV / SQL 整合チェック（CI）
- **CI（Continuous Integration）**: GitHub Actions / Azure DevOps 等で実行する自動テストパイプライン。  
- 本プロジェクトでは以下を自動化する。
  - CSV → SQL エクスポートを毎回実行し、差分があるかチェック。  
  - `tool_dependencies.csv`・`database_setup.sql`・`initial_data_setup.sql` がCSVと一致しているかを `scripts/verify-csv-sql-consistency.js` で検証。  
  - 失敗した場合はPRをブロックし、手動修正を促す。

### 今後の実装ステップ
1. `tool_dependencies.csv` と `Routes.tsx` を最新テーブル名に合わせて更新。  
2. `DatabaseContext` 配下に `getAppMode()` と `saveTableToCsv()` などのユーティリティを用意し、各ツールから利用する。  
3. Data-IO / Schema Manager / Language Manager で AppMode 分岐を実装。  
4. CSV→SQL エクスポートスクリプトの整備と CI への組み込み。  
5. ドキュメント化（本ファイル）を README などから参照できるようリンクする。

### 2025-11-15 更新
- `scripts/verify-csv-sql-consistency.js` が `Routes.tsx` の `ALL_TOOLS` からツールを自動抽出し、CSV との齟齬を検知する。
- 同スクリプトで `tool_dependencies.csv` に記載されたテーブルが CSV 側に存在するかチェックするようになった（メーカー派生テーブルは除外）。
- `src/core/utils/appMode.ts` に `getStoredAppMode` / `setStoredAppMode` / `isCsvWritableMode` などのヘルパーを追加し、`localStorage` への直接アクセスを廃止。

### AppMode 検証手順
1. **モード切替の確認**  
   - `Dev Tools > 動作モード設定` で `live / csv-debug / csv-writable` を切り替え、`localStorage.appMode`（ヘルパー経由）が更新されることを確認。  
   - リロード後、それぞれのモードでトップページが正常に表示されるか確認する。
2. **csv-writable の保存動作**  
   - Language Manager などでテキストを編集し、保存後に対応する `templates/languages/**` の CSV が更新されることを確認。  
   - Git 管理下の差分を戻す場合は `git checkout -- <file>` などでロールバックする。
3. **live モードのフォールバック**  
   - API に接続できない状態で `live` を選択すると自動で `csv-debug` に戻る（コンソールに警告が出る）ことを確認。  
   - PHP サーバー起動時は `/api/app-initialization-data.php` が 200 を返し、そのまま live で動作することを確認。
4. **自動検証**  
   - `node scripts/verify-csv-sql-consistency.js` を実行し、エラーが無いことを確認（警告は情報レベル）。  
   - CI でも同コマンドを実行し、`tool_dependencies`/CSV/SQL の不整合を検知させる。

