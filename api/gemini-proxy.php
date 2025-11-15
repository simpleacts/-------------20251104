<?php
// This file will be renamed to gemini-proxy.php on the server.

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php'; // $pdo is available

// --- Main Logic ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is accepted.']);
    exit();
}

// Fetch API Key and Model from the database
try {
    $stmt = $pdo->prepare("SELECT `value` FROM `google_api_settings` WHERE `key` = 'GEMINI_API_KEY' LIMIT 1");
    $stmt->execute();
    $api_key_row = $stmt->fetch(PDO::FETCH_ASSOC);
    $api_key = $api_key_row ? trim($api_key_row['value']) : null;
    
    // Get model from ai_settings
    $stmt = $pdo->prepare("SELECT `value` FROM `ai_settings` WHERE `key` = 'GEMINI_MODEL' LIMIT 1");
    $stmt->execute();
    $model_row = $stmt->fetch(PDO::FETCH_ASSOC);
    $modelValue = $model_row && !empty($model_row['value']) ? trim($model_row['value']) : '';
    
    // デフォルト値を設定（文字列'undefined'も無効として扱う）
    $model = 'gemini-2.5-flash';
    if ($modelValue && 
        $modelValue !== '' && 
        strtolower($modelValue) !== 'undefined' &&
        strtolower($modelValue) !== 'null') {
        $model = $modelValue;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error when fetching settings: ' . $e->getMessage()]);
    exit();
}

if (empty($api_key) || $api_key === 'undefined' || $api_key === 'null') {
    http_response_code(500);
    error_log("Gemini API Key check failed. Value: " . var_export($api_key, true));
    echo json_encode(['error' => 'Gemini APIキーが設定されていません。「Google連携設定」ツールで設定してください。']);
    exit();
}

$json_data = file_get_contents('php://input');
$request = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($request['endpoint']) || !isset($request['payload'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload. Required fields: "endpoint", "payload".']);
    exit();
}

$endpoint = $request['endpoint'];
$payload = $request['payload'];
// Allow override of model from request payload if provided
if (isset($request['model']) && 
    !empty($request['model']) && 
    strtolower($request['model']) !== 'undefined' &&
    strtolower($request['model']) !== 'null') {
    $model = trim($request['model']);
}
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$api_key}";

$post_data = [];

// Based on the endpoint, construct the correct payload for the Gemini API
try {
    switch ($endpoint) {
        case 'triageEmail':
            $email = $payload['email'];
            $prompt = "あなたはTシャツプリント屋の優秀なアシスタントです。以下のメールを解析し、指定されたJSON形式で情報を整理してください。
メール情報:
- 差出人: {$email['from_address']}
- 件名: {$email['subject']}
- 本文: {$email['body']}
タスク:
1. `summary`: メール内容を日本語で1文に要約。
2. `category`: ('inquiry', 'request', 'notification', 'spam', 'other') に分類。
3. `action_suggestion`: ('create_task', 'reply', 'none') を提案。
4. `task_details`: `action_suggestion`が'create_task'の場合、タスクの'title'を提案。
5. `reply_draft`: `action_suggestion`が'reply'の場合、返信の'subject'と'body'を作成。
JSON形式で厳密に出力してください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'generateReplyFromContext':
            $prompt = "あなたは顧客対応のプロです。元のメールと担当者の指示に基づき、顧客への返信メールをJSON形式で作成してください。
元のメール件名: {$payload['originalEmail']['subject']}
元のメール本文: {$payload['originalEmail']['body']}
担当者の指示: {$payload['userInstruction']}
顧客名: {$payload['customerName']}
出力JSONスキーマ: { \"subject\": string, \"body\": string }";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'generateEmailTemplate':
            $prompt = "ビジネスメールのプロとして、以下の指示に基づいてメール定型文の本文を作成してください。
- 口調: {$payload['tone']}
- 署名: {$payload['signature']}
- 指示: {$payload['prompt']}
本文のみを出力し、件名は不要です。顧客名などは`{{customer_name}}`のようにプレースホルダーを使用してください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]]];
            break;

        case 'generateDbOperation':
            $schemaString = implode(', ', array_map(fn($col) => "{$col['name']} ({$col['type']})", $payload['schema']));
            $prompt = "Generate a database operation for the table '{$payload['tableName']}' with schema '{$schemaString}'.
User request: '{$payload['query']}'
Generate a single JSON object for the operation. The primary key is '{$payload['schema'][0]['name']}'.";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'generateProductDescription':
            $product = $payload['product'];
            $brandValue = $product['brand'] ?? $product['brand_id'] ?? '';
            $prompt = "以下の商品情報に基づき、魅力的で簡潔な商品説明文を日本語で150字程度で作成してください。Web上の公開情報も参考にしてください。
- 商品名: {$product['name']}
- ブランド: {$brandValue}
- 型番: {$product['code']}";
            $post_data = [
                'contents' => [['parts' => [['text' => $prompt]]]], 
                'generationConfig' => ['responseMimeType' => 'application/json'],
                'tools' => [['googleSearch' => []]]
            ];
            break;
            
        case 'analyzeInvoice':
            $image = $payload['image'];
            $prompt = "あなたは経理アシスタントです。添付の請求書画像を解析し、以下の情報をJSON形式で抽出してください。
- vendor_name: 請求元の正式名称
- invoice_number: 請求書番号
- issue_date: 発行日 (YYYY-MM-DD)
- due_date: 支払期限 (YYYY-MM-DD)
- total_amount: 請求合計金額（税込、数値型）
日付が和暦の場合は西暦に変換してください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt], ['inlineData' => ['mimeType' => $image['type'], 'data' => $image['base64Data']]]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'getFixSuggestion':
            $prompt = "あなたは、私が開発しているWebアプリケーションのシニアテクニカルサポート担当です。
アプリケーションのシステム診断ツールで以下のエラーが検出されました。
このエラーの原因を簡潔に診断し、私があなた（AI開発者）に修正を依頼するための具体的な指示文を提案してください。

# エラー情報
- 診断項目: {$payload['testName']}
- エラーメッセージ:
```
{$payload['errorMessage']}
```

# あなたのタスク
上記のエラー情報に基づき、以下の2つの項目を含むJSONオブジェクトを生成してください。
1.  `diagnosis`: エラーの根本原因についての簡潔な診断（例：「データベースの接続情報が正しくないようです。」）
2.  `suggestion`: 私があなたに修正を依頼するために、このチャットにコピー＆ペーストできる具体的な指示文。（例：「データベース接続設定を確認し、api/db_connect.php.txt内の接続情報が正しいか確認してください。」）

厳密なJSON形式で出力してください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'assignImagesToProducts':
            $productsList = implode("\n", array_map(function($p) { return "- ID: {$p['id']}, 商品名: {$p['name']}, 品番: {$p['code']}"; }, $payload['products']));
            $imagesList = implode("\n", array_map(function($i) { return "- {$i['name']}"; }, $payload['images']));
            $prompt = "以下の商品リストと画像ファイル名リストがあります。
各画像がどの商品に対応するかを判断し、最も確信度の高いペアをJSON配列で返してください。
JSONの各要素は `{ \"productId\": \"...\", \"imageName\": \"...\" }` の形式にしてください。

商品リスト:
{$productsList}

画像ファイル名リスト:
{$imagesList}";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'fetchColorData':
            $prompt = strtoupper($payload['standard']) . "のカラーコード「{$payload['colorCode']}」の情報をJSON形式で取得してください。HEX, RGB, CMYKの値を含めてください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'fetchColorChunk':
            $standard = strtoupper($payload['details']['standard']);
            $detailsText = $payload['details']['standard'] === 'dic' 
                ? "- パート: {$payload['details']['part']}"
                : "- タイプ: {$payload['details']['type']}";
            $prompt = "以下の指定範囲のカラーデータをJSON配列で生成してください。
- 標準: {$standard}
{$detailsText}
- 開始番号: {$payload['details']['start']}
- 終了番号: {$payload['details']['end']}
各要素にはid, code, hex, rgb, cmykを含めてください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'analyzeDocumentLayout':
            $image = $payload['image'];
            $prompt = "添付の帳票レイアウト画像を解析し、各要素（ヘッダー、宛名、差出人、明細、合計など）をブロックとして抽出し、JSON配列で出力してください。各ブロックには`type`, `config` (width, alignなど) を含めてください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt], ['inlineData' => ['mimeType' => $image['type'], 'data' => $image['base64Data']]]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'generateDocumentLayouts':
            $prompt = "「{$payload['prompt']}」という指示に基づき、PDF帳票のレイアウトを3パターン提案してください。各レイアウトはJSONブロックの配列として表現し、全体をJSON配列でラップしてください。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'generateTranslations':
            $japaneseTerms = json_encode($payload['japaneseTerms'], JSON_UNESCAPED_UNICODE);
            $prompt = "以下の日本語のUIテキストを{$payload['targetLanguageName']}に翻訳してください。入力と同じキーを持つJSONオブジェクトで結果を返してください。\n\n{$japaneseTerms}";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'updateIdFormatFromPrompt':
            $currentFormats = json_encode($payload['currentFormats'], JSON_UNESCAPED_UNICODE);
            $prompt = "ユーザーの指示に基づき、ID形式設定を更新するためのJSON配列を生成してください。
現在の設定: {$currentFormats}
ユーザーの指示: \"{$payload['prompt']}\"
出力は変更が必要な項目のみを含む `Partial<IdFormat>[]` 形式のJSON配列とします。";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'generateDevelopmentTasks':
            $prompt = "あなたは優秀なプロジェクトマネージャーです。以下のアイデアや要望を分析し、開発タスクを提案してください。
入力: \"{$payload['inputText']}\"
出力として、以下のキーを持つJSONオブジェクトを生成してください。
- feasibility: (任意) 実現可能性についての簡単な評価
- summary: アイデアの要約
- tasks_markdown: 実行すべき開発タスクをマークダウンのリスト形式で記述";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'suggestModuleInfo':
            $prompt = "あなたはソフトウェアアーキテクトです。ファイルパス「{$payload['filePath']}」から、そのモジュール（コンポーネントやサービス）の役割を推測してください。
出力として、以下のキーを持つJSONオブジェクトを生成してください。
- japaneseName: 日本語の分かりやすい名前
- description: モジュールの役割を簡潔に説明した文章
- type: 事前定義されたカテゴリの中から最も適切と思われるものを選択 (`core/...`, `page/...`, `ui/...`, `service/...`, `other`)";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        case 'suggestFileClassification':
            $fileContent = substr($payload['fileContent'], 0, 3000);
            $toolList = implode("\n", array_map(function($t) { return "- {$t['id']}: {$t['name']}"; }, $payload['toolList']));
            $prompt = "あなたはモノリシックなReactアプリケーションを機能ごとにパッケージに分割する専門のソフトウェアアーキテクトです。
以下のファイルパスとファイル内容を分析し、どのツール（機能）に属するかを判断してください。

ファイルパス: {$payload['filePath']}

ファイル内容の冒頭:
```
{$fileContent}
```

所属する可能性のあるツールリスト:
{$toolList}

最も適切と思われるツールのIDを、以下のJSON形式で1つだけ返してください。他のテキストは不要です。
{ \"toolId\": \"...\" }";
            $post_data = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];
            break;

        default:
             $post_data = ['contents' => [['parts' => [['text' => json_encode($payload)]]]]];
             break;
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Failed to construct Gemini payload: ' . $e->getMessage()]);
    exit();
}


// --- cURL Request to Gemini API ---
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Should be true in production

$response_body = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($response_body === false) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL error calling Gemini API: ' . $curl_error]);
    exit();
}

$response_data = json_decode($response_body, true);

if ($http_code >= 400) {
    http_response_code($http_code);
    $error_message = $response_data['error']['message'] ?? 'An unknown error occurred with the Gemini API.';
    echo json_encode(['error' => $error_message, 'details' => $response_data]);
    exit();
}

// --- Success Response ---
$text_content = $response_data['candidates'][0]['content']['parts'][0]['text'] ?? null;
$candidates = $response_data['candidates'] ?? null;

if (isset($post_data['generationConfig']['responseMimeType']) && $post_data['generationConfig']['responseMimeType'] === 'application/json' && $text_content) {
    $text_content = trim(str_replace(['```json', '```'], '', $text_content));
}

// candidates全体を返す（geminiService.tsでgroundingMetadataを取得するため）
echo json_encode(['text' => $text_content, 'candidates' => $candidates]);

?>