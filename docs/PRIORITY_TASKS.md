# 優先タスク一覧

## 概要

管理用フロントエンドの機能改善を優先順位順にまとめています。

## フェーズ1: 緊急修正（即座に実施）

### 1.1 データベースエラーの修正

- [ ] `payment_methods` テーブルの作成
  - ファイル: `templates/database_setup.sql.txt`, `dist/database_setup.sql.txt`
  - 影響範囲: Estimator の DocumentSettingsSection
  - 優先度: 高

### 1.2 インポートエラーの修正

- [ ] `getProductsMasterFromStock` のインポート追加
  - ファイル: `src/features/estimator/document/hooks/useDocumentData.ts`
  - 影響範囲: Estimator の DocumentManager
  - 優先度: 高

---

## フェーズ2: パフォーマンス改善（1週間以内）

### 2.1 ファイルパス管理の改善

- [ ] パスエイリアスの拡張
  - ファイル: `vite.config.ts`, `tsconfig.json`
  - 優先度: 高
  - 詳細: `docs/FILE_PATH_MANAGEMENT.md` を参照

- [ ] Barrel Exports の拡張
  - ディレクトリ: `src/core/utils/`, `src/shared/ui/`
  - 優先度: 中
  - 詳細: `docs/FILE_PATH_MANAGEMENT.md` を参照

### 2.2 再レンダリングの最適化

- [ ] Production Scheduling のちらつき修正
  - ファイル: `src/features/production-scheduler/pages/ProductionSchedulerPage.tsx`
  - 方法: `useRef` を使用した読み込み済みテーブルの管理
  - 優先度: 高
  - 詳細: `docs/ERROR_FIXES_SUMMARY.md` を参照

- [ ] Estimator の読み込み問題修正
  - ファイル: `src/features/estimator/pages/EstimatorPage.tsx`
  - 方法: メーカー依存テーブルの適切なチェック
  - 優先度: 高
  - 詳細: `docs/ERROR_FIXES_SUMMARY.md` を参照

---

## フェーズ3: エラー修正（2週間以内）

### 3.1 React エラーの修正

- [ ] Product Data の React Error #310
  - ファイル: `src/features/product-management/organisms/ProductManager.tsx`
  - 方法: `null` チェックの追加
  - 優先度: 中
  - 詳細: `docs/ERROR_FIXES_SUMMARY.md` を参照

- [ ] PDF Preview Settings のテーブルエラー
  - ファイル: `src/features/pdf-preview-settings/pages/PdfPreviewSettingsPage.tsx`
  - 方法: データ取得の `useEffect` 追加
  - 優先度: 中
  - 詳細: `docs/ERROR_FIXES_SUMMARY.md` を参照

---

## フェーズ4: コード品質向上（1ヶ月以内）

### 4.1 既存コードのリファクタリング

- [ ] 相対パスをパスエイリアスに置き換え
  - 優先度: 低
  - 段階的に実施
  - 詳細: `docs/FILE_PATH_MANAGEMENT.md` を参照

### 4.2 ドキュメント整備

- [ ] 各ツールの使用方法ドキュメント作成
- [ ] API エンドポイントのドキュメント作成

---

## 完了条件

各フェーズの完了条件：

- **フェーズ1**: すべての緊急エラーが解消され、基本的な機能が動作する
- **フェーズ2**: パフォーマンスが改善され、ユーザー体験が向上する
- **フェーズ3**: すべての既知のエラーが解消される
- **フェーズ4**: コードの保守性が向上し、新機能の追加が容易になる

---

## 注意事項

- 各タスクは独立して実施可能だが、依存関係がある場合は順序を守る
- 修正後は必ず動作確認を行う
- 大きな変更はブランチを切って実施する
- データベーススキーマの変更は、`templates/database_setup.sql.txt` と `dist/database_setup.sql.txt` の両方を更新する

---

## 関連ドキュメント

- `docs/FILE_PATH_MANAGEMENT.md` - ファイルパス管理の改善計画
- `docs/ERROR_FIXES_SUMMARY.md` - エラー修正の詳細
- `docs/WEBSITE_BUILDER_PLAN.md` - ウェブサイト構築ツールの計画（後回し）


