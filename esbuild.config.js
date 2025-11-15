const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// tsconfig.jsonからパスエイリアスを読み込む
const tsconfig = require('./tsconfig.json');
const paths = tsconfig.compilerOptions.paths || {};

// パスエイリアスをesbuildのプラグイン形式に変換
const pathAliasPlugin = {
    name: 'path-alias',
    setup(build) {
        // エイリアスマップを作成
        const aliasMap = {};
        Object.keys(paths).forEach(aliasKey => {
            const aliasPattern = aliasKey.replace('/*', '');
            const aliasPath = paths[aliasKey][0].replace('/*', '');
            const resolvedAliasPath = path.resolve(__dirname, aliasPath);
            aliasMap[aliasPattern] = resolvedAliasPath;
        });
        
        // デバッグ用: エイリアスマップを出力
        console.log('[path-alias-plugin] Alias map:', aliasMap);
        
        // すべてのエイリアスパターンにマッチするインポートを解決
        // namespace: 'file'を指定して、通常のファイル解決の前に実行されるようにする
        build.onResolve({ filter: /^@/, namespace: 'file' }, args => {
            // エイリアスパターンを検出
            let matchedAlias = null;
            let relativePath = args.path;
            
            // 最長マッチを優先するため、長いエイリアスから順にチェック
            const sortedAliases = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
            
            for (const aliasPattern of sortedAliases) {
                if (args.path.startsWith(aliasPattern + '/')) {
                    matchedAlias = aliasPattern;
                    relativePath = args.path.substring(aliasPattern.length + 1);
                    break;
                }
            }
            
            if (!matchedAlias) {
                return null; // エイリアスにマッチしない場合は通常の解決に任せる
            }
            
            const resolvedAliasPath = aliasMap[matchedAlias];
            const resolvedPath = path.resolve(resolvedAliasPath, relativePath);
            
            // デバッグ用: パス解決情報を出力
            console.log(`[path-alias-plugin] Resolving: ${args.path} -> ${resolvedPath}`);
            
            // ファイル拡張子がない場合は.tsx、.ts、または/index.tsx、/index.tsを試す
            let finalPath = resolvedPath;
            const extensions = ['.tsx', '.ts', '.jsx', '.js'];
            const indexFiles = ['index.tsx', 'index.ts', 'index.jsx', 'index.js'];
            
            // まず拡張子付きファイルを確認
            let found = false;
            for (const ext of extensions) {
                const testPath = resolvedPath + ext;
                if (fs.existsSync(testPath)) {
                    finalPath = testPath;
                    found = true;
                    break;
                }
            }
            
            // 拡張子付きファイルが見つからない場合は、ディレクトリ内のindexファイルを確認
            if (!found && fs.existsSync(resolvedPath)) {
                try {
                    const stats = fs.statSync(resolvedPath);
                    if (stats.isDirectory()) {
                        for (const indexFile of indexFiles) {
                            const testPath = path.join(resolvedPath, indexFile);
                            if (fs.existsSync(testPath)) {
                                finalPath = testPath;
                                found = true;
                                break;
                            }
                        }
                    }
                } catch (err) {
                    // エラーが発生した場合は無視して続行
                }
            }
            
            // ファイルが見つからない場合は、元のパスを返す（esbuildがエラーを報告する）
            if (!found && !fs.existsSync(resolvedPath)) {
                // 最後の試み: ディレクトリとして存在するか確認
                const parentDir = path.dirname(resolvedPath);
                const fileName = path.basename(resolvedPath);
                if (fs.existsSync(parentDir)) {
                    try {
                        const stats = fs.statSync(parentDir);
                        if (stats.isDirectory()) {
                            // 親ディレクトリ内でファイルを探す
                            for (const ext of extensions) {
                                const testPath = path.join(parentDir, fileName + ext);
                                if (fs.existsSync(testPath)) {
                                    finalPath = testPath;
                                    found = true;
                                    break;
                                }
                            }
                        }
                    } catch (err) {
                        // エラーが発生した場合は無視して続行
                    }
                }
            }
            
            if (!found) {
                console.warn(`[path-alias-plugin] File not found: ${resolvedPath}`);
            }
            
            return { path: finalPath };
        });
    },
};

// ビルド設定
const buildOptions = {
    entryPoints: ['index.tsx'],
    bundle: true,
    outdir: 'dist',
    format: 'esm',
    jsx: 'automatic',
    loader: {
        '.tsx': 'tsx',
    },
    define: {
        'process.env.API_KEY': 'undefined',
    },
    external: [
        'react',
        'react/*',
        'react-dom/*',
        '@google/genai',
        'markdown-it',
        'idb',
        'react-window',
        'react-virtualized-auto-sizer',
    ],
    plugins: [pathAliasPlugin],
    logLevel: 'info',
};

// ビルド実行
esbuild.build(buildOptions).catch(() => process.exit(1));

