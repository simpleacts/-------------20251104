# ファイルパス管理の改善計画

## 目的

ファイルの移動や名前変更に強いコードベースを構築し、保守性を向上させる。

## 現状の問題

- 相対パス（`../../../`）が多用されており、ファイル移動時に多数の修正が必要
- パスエイリアス（`@`）は設定されているが、ほとんど使用されていない
- Barrel Exports（`index.ts`）は一部で使用されているが、未統一

## 実装計画

### フェーズ1: パスエイリアスの拡張（優先度：高）

#### 1.1 `vite.config.ts` の更新

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, '.'),
    '@core': path.resolve(__dirname, './src/core'),
    '@shared': path.resolve(__dirname, './src/shared'),
    '@features': path.resolve(__dirname, './src/features'),
    '@components': path.resolve(__dirname, './src/shared/ui'),
  }
}
```

#### 1.2 `tsconfig.json` の更新

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@core/*": ["./src/core/*"],
      "@shared/*": ["./src/shared/*"],
      "@features/*": ["./src/features/*"],
      "@components/*": ["./src/shared/ui/*"]
    }
  }
}
```

### フェーズ2: Barrel Exports の拡張（優先度：中）

#### 2.1 既存のBarrel Exports確認

- `src/shared/types/index.ts` - 既に実装済み

#### 2.2 追加すべきBarrel Exports

```
src/core/
├── utils/
│   └── index.ts          # ユーティリティ関数の再エクスポート
├── hooks/
│   └── index.ts          # カスタムフックの再エクスポート
└── services/
    └── index.ts          # サービスの再エクスポート

src/shared/ui/
├── atoms/
│   └── index.ts          # アトムコンポーネントの再エクスポート
├── molecules/
│   └── index.ts          # モレキュールコンポーネントの再エクスポート
└── organisms/
    └── index.ts          # オルガニズムコンポーネントの再エクスポート
```

### フェーズ3: 既存コードの移行（優先度：低）

段階的に相対パスをパスエイリアスに置き換える。

## メリット

1. **ファイル移動に強い**: ファイルを移動してもエイリアス定義を更新するだけで済む
2. **可読性向上**: インポート文が短く、明確になる
3. **保守性向上**: ファイル構造の変更に対する影響を最小化

## 注意事項

- Barrel ExportsはTree-shakingに影響する可能性があるため、慎重に使用する
- 既存コードの移行は段階的に行う（一度にすべて変更しない）

## 実装例

### 修正前（相対パス）

```typescript
import { Button } from '../../../shared/ui/atoms/Button';
import { useDatabase } from '../../../../core/hooks/useDatabase';
```

### 修正後（パスエイリアス）

```typescript
import { Button } from '@components/atoms/Button';
import { useDatabase } from '@core/hooks/useDatabase';
```

### Barrel Exports使用例

```typescript
// src/shared/ui/atoms/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Label } from './Label';

// 使用側
import { Button, Input, Label } from '@components/atoms';
```


