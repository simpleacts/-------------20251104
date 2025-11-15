<?php
// This file will be renamed to generate-pdf.php on the server.
// Use mPDF library, assuming it's installed via Composer in the website's root directory.
require_once(__DIR__ . '/../../vendor/autoload.php');

// --- Helper Functions to process data ---

function get_grouped_items($orderDetails, $products, $colorPalettes) {
    $productMap = array_reduce($products, function($map, $product) {
        $map[$product['id']] = $product;
        return $map;
    }, []);

    $grouped = [];
    foreach ($orderDetails as $item) {
        $key = $item['productId'] . '_' . $item['unitPrice'];
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'name' => $item['productName'],
                'productId' => $item['productId'],
                'unitPrice' => $item['unitPrice'],
                'totalQuantity' => 0,
                'subtotal' => 0,
                'details' => []
            ];
        }
        $grouped[$key]['totalQuantity'] += $item['quantity'];
        $grouped[$key]['subtotal'] += $item['quantity'] * $item['unitPrice'];
        $grouped[$key]['details'][] = [
            'color' => $item['color'],
            'size' => $item['size'],
            'quantity' => $item['quantity']
        ];
    }
    return array_values($grouped);
}

function get_detailed_print_items($printDesigns, $totalQuantity, $pricingData, $printLocations, $cost) {
    $tier = null;
    $printPricingTiers = $pricingData['printPricingTiers'] ?? [];
    foreach ($printPricingTiers as $t) {
        if ($totalQuantity >= $t['min'] && $totalQuantity <= $t['max']) {
            $tier = $t;
            break;
        }
    }
    if (!$tier || $totalQuantity == 0) {
        return ['designItems' => [], 'itemSurcharge' => null, 'plateTypeSurcharge' => null];
    }
    
    $locationMap = array_reduce($printLocations, function($map, $loc) {
        $map[$loc['locationId']] = $loc;
        return $map;
    }, []);

    $designItems = [];
    $designIndex = 0;
    foreach ($printDesigns as $design) {
        $designIndex++;
        if (empty($design['location']) || $design['colors'] <= 0) continue;

        $locationInfo = $locationMap[$design['location']] ?? null;
        $groupName = $locationInfo ? $locationInfo['groupName'] : '';
        $locationLabel = $locationInfo ? $locationInfo['label'] : '';
        $name = "プリント代: デザイン{$designIndex} {$groupName} {$locationLabel}";
        
        $basePrintPrice = $tier['firstColor'] + max(0, $design['colors'] - 1) * $tier['additionalColor'];
        
        $breakdown = [['label' => "基本 ({$design['colors']}色)", 'amount' => $basePrintPrice]];
        
        $unitPrice = array_reduce($breakdown, function($sum, $item) { return $sum + $item['amount']; }, 0);
        
        $designItems[] = [
            'name' => $name, 'breakdown' => $breakdown, 'unitPrice' => $unitPrice,
            'quantity' => $totalQuantity, 'subtotal' => $unitPrice * $totalQuantity
        ];
    }
    
    $itemSurcharge = null;
    $printCostDetail = $cost['printCostDetail'] ?? [];
    if (($printCostDetail['byItem'] ?? 0) > 0) {
        $itemSurcharge = [
            'name' => '商品特性による追加料金 (裏起毛など)',
            'unitPrice' => round($printCostDetail['byItem'] / $totalQuantity),
            'quantity' => $totalQuantity, 'subtotal' => $printCostDetail['byItem']
        ];
    }
    
    $plateTypeSurcharge = null;
    if (($printCostDetail['byPlateType'] ?? 0) > 0) {
        $plateTypeSurcharge = [
            'name' => '分解版による追加料金',
            'unitPrice' => round($printCostDetail['byPlateType'] / $totalQuantity),
            'quantity' => $totalQuantity, 'subtotal' => $printCostDetail['byPlateType']
        ];
    }
    return ['designItems' => $designItems, 'itemSurcharge' => $itemSurcharge, 'plateTypeSurcharge' => $plateTypeSurcharge];
}


// --- PDF Generation Logic ---

function generate_pdf_from_data($payload) {
    $type = $payload['type'];
    $data = $payload['data'];
    
    // 帳票タイプに応じたタイトルとラベルの設定
    switch ($type) {
        case 'invoice':
            $title = '御請求書';
            $totalLabel = '御請求金額 (税込)';
            $documentNumberLabel = '請求書番号';
            break;
        case 'delivery_slip':
            $title = '納品書';
            $totalLabel = '合計金額 (税込)';
            $documentNumberLabel = '納品書番号';
            break;
        case 'receipt':
            $title = '領収書';
            $totalLabel = '領収金額 (税込)';
            $documentNumberLabel = '領収書番号';
            break;
        case 'worksheet':
            $title = '作業指示書';
            $totalLabel = '合計金額 (税込)';
            $documentNumberLabel = '作業指示書番号';
            break;
        default: // 'quote' or others
            $title = '御見積書';
            $totalLabel = '御見積金額 (税込)';
            $documentNumberLabel = '見積書番号';
            break;
    }
    
    $tshirtLabel = $data['isBringInMode'] ? '持ち込み手数料' : 'Tシャツ本体代';

    $customerInfo = $data['customerInfo'] ?? [];
    $companyInfo = $data['companyInfo'] ?? [];
    $cost = $data['cost'] ?? [];
    $estimateId = $data['estimateId'] ?? '';
    $paymentDueDate = $data['paymentDueDate'] ?? null;

    $addresseeLine = htmlspecialchars(trim(($customerInfo['companyName'] ?? '') . ' ' . ($customerInfo['nameKanji'] ?? '')));
    $postalCodeLine = $customerInfo['zipCode'] ? '〒' . substr($customerInfo['zipCode'], 0, 3) . '-' . substr($customerInfo['zipCode'], 3) : '';
    
    ob_start();
    ?>
    <!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
    <style>
        body { font-family: 'ipa', sans-serif; color: #000; font-size: 10pt; }
        h1 { font-size: 24pt; text-align: center; margin-bottom: 20px; font-weight: bold; }
        .address-block { width: 50%; font-size: 10pt; }
        .address-block .addressee { font-size: 12pt; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
        .total-block { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin-bottom: 15px; }
        .total-block .label { font-size: 14pt; font-weight: bold; }
        .total-block .amount { font-size: 22pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1.5px solid #000; padding: 6px; vertical-align: top; }
        th { background-color: #e0e0e0; font-weight: bold; text-align: center; }
        .text-right { text-align: right; } .text-center { text-align: center; }
        .item-details { padding-left: 15px; font-size: 9pt; }
        .summary-table { width: 50%; margin-left: auto; }
        .summary-table .label { background-color: #e0e0e0; font-weight: bold; }
        .notes-block { margin-top: 20px; }
        .notes-block h3 { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 5px; }
        .notes-block .content { font-size: 9pt; white-space: pre-wrap; }
        .bank-info { margin-top: 20px; padding: 10px; border: 2px solid #000; }
        .bank-info h3 { text-align: center; font-weight: bold; margin-bottom: 8px; }
    </style>
    </head><body>
    
    <h1><?= htmlspecialchars($title) ?></h1>

    <table style="width:100%; border:none; margin-bottom: 10px;"><tr>
      <td style="width:55%; border:none; vertical-align:top;">
        <div class="addressee"><?= $addresseeLine ?> 様</div>
        <p><?= htmlspecialchars($postalCodeLine) ?></p>
        <p><?= htmlspecialchars($customerInfo['address1'] ?? '') ?></p>
        <p><?= htmlspecialchars($customerInfo['address2'] ?? '') ?></p>
        <p>TEL: <?= htmlspecialchars($customerInfo['phone'] ?? '') ?></p>
      </td>
      <td style="width:45%; border:none; text-align:right; vertical-align:top;">
        <p style="margin-bottom: 10px;"><?= htmlspecialchars($documentNumberLabel) ?>: <?= htmlspecialchars($estimateId) ?></p>
        <?php
        // 帳票タイプに応じた日付ラベルの表示
        $dateLabel = '発行日';
        if ($type === 'delivery_slip') {
            $dateLabel = '納品日';
        } elseif ($type === 'invoice') {
            $dateLabel = '請求日';
        } elseif ($type === 'receipt') {
            $dateLabel = '領収日';
        }
        ?>
        <p><?= $dateLabel ?>: <?= date('Y年m月d日') ?></p>
        <p style="margin-top: 15px;"><?= htmlspecialchars($companyInfo['companyName'] ?? '') ?></p>
        <p>〒<?= htmlspecialchars($companyInfo['zip'] ?? '') ?></p>
        <p><?= htmlspecialchars($companyInfo['address'] ?? '') ?></p>
        <p>TEL: <?= htmlspecialchars($companyInfo['tel'] ?? '') ?></p>
        <?php if (!empty($companyInfo['invoiceIssuerNumber'])): ?>
            <p style="margin-top: 10px;">適格請求書発行事業者登録番号：<?= htmlspecialchars($companyInfo['invoiceIssuerNumber']) ?></p>
        <?php endif; ?>
      </td>
    </tr></table>

    <table class="total-block" style="border:none;"><tr>
        <td style="border:none;" class="label"><?= htmlspecialchars($totalLabel) ?></td>
        <td style="border:none; text-align:right;" class="amount">¥ <?= number_format($cost['totalCostWithTax'] ?? 0) ?></td>
    </tr></table>

    <table><thead><tr>
        <th>品目</th><th style="width:15%">単価</th><th style="width:10%">数量</th><th style="width:15%">価格</th>
    </tr></thead><tbody>
        <tr>
            <td>
                <strong><?= htmlspecialchars($tshirtLabel) ?></strong>
            </td>
            <td class="text-center">-</td>
            <td class="text-center"><?= $data['totalQuantity'] ?? 0 ?></td>
            <td class="text-right">¥<?= number_format($cost['tshirtCost'] ?? 0) ?></td>
        </tr>
        <?php
            $detailedPrintItems = get_detailed_print_items(
                $data['printDesigns'] ?? [], 
                $data['totalQuantity'] ?? 0, 
                $data['pricingData'] ?? ['printPricingTiers' => []], 
                $data['printLocations'] ?? [], 
                $cost
            );
            foreach($detailedPrintItems['designItems'] as $item):
        ?>
        <tr>
            <td><strong><?= htmlspecialchars($item['name']) ?></strong></td>
            <td class="text-center">¥<?= number_format($item['unitPrice']) ?></td>
            <td class="text-center"><?= $item['quantity'] ?></td>
            <td class="text-right">¥<?= number_format($item['subtotal']) ?></td>
        </tr>
        <?php endforeach; ?>
        <?php foreach(($data['printDesigns'] ?? []) as $idx => $design): 
            $setupCostDetail = $cost['setupCostDetail'] ?? [];
            if(($setupCostDetail[$design['id']] ?? 0) == 0) continue; ?>
        <tr>
            <td><strong>版代: デザイン<?= $idx+1 ?></strong></td>
            <td class="text-center">-</td><td class="text-center"><?= $design['colors'] ?? 0 ?></td>
            <td class="text-right">¥<?= number_format($setupCostDetail[$design['id']] ?? 0) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody></table>
    
    <table class="summary-table" style="margin-top: 10px;">
        <tr><td class="label">小計</td><td class="text-right">¥<?= number_format($cost['totalCost'] ?? 0) ?></td></tr>
        <tr><td class="label">送料</td><td class="text-right"><?= ($cost['shippingCost'] ?? 0) > 0 ? '¥' . number_format($cost['shippingCost'] ?? 0) : '無料' ?></td></tr>
        <tr><td class="label">消費税 (10%)</td><td class="text-right">¥<?= number_format($cost['tax'] ?? 0) ?></td></tr>
        <tr><td class="label">合計</td><td class="text-right" style="font-weight:bold; font-size: 11pt;">¥<?= number_format($cost['totalCostWithTax'] ?? 0) ?></td></tr>
    </table>

    <div class="notes-block"><h3>備考</h3><div class="content"><?= htmlspecialchars(!empty($customerInfo['notes']) ? $customerInfo['notes'] : ' ') ?></div></div>
    
    <?php if ($type === 'invoice'): ?>
    <div class="bank-info">
        <h3>お振込先</h3>
        <table style="border:none;">
            <tr><td style="width:30%; border:none; font-weight:bold;">金融機関名</td><td style="border:none;"><?= htmlspecialchars($companyInfo['bankName'] ?? '') ?></td></tr>
            <tr><td style="border:none; font-weight:bold;">支店名</td><td style="border:none;"><?= htmlspecialchars($companyInfo['bankBranchName'] ?? '') ?></td></tr>
            <tr><td style="border:none; font-weight:bold;">口座種別・番号</td><td style="border:none;"><?= htmlspecialchars($companyInfo['bankAccountType'] ?? '') ?> <?= htmlspecialchars($companyInfo['bankAccountNumber'] ?? '') ?></td></tr>
            <tr><td style="border:none; font-weight:bold;">口座名義</td><td style="border:none;"><?= htmlspecialchars($companyInfo['bankAccountHolder'] ?? '') ?></td></tr>
        </table>
        <?php if ($paymentDueDate): ?><p style="text-align:center; margin-top:10px; font-weight:bold;">お支払い期限: <?= htmlspecialchars($paymentDueDate) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    
    <?php if ($type === 'receipt'): ?>
    <div class="bank-info">
        <h3>但し書き</h3>
        <p style="text-align:center; margin-top:10px; font-weight:bold;"><?= htmlspecialchars($title) ?>として</p>
    </div>
    <?php endif; ?>

    </body></html>
    <?php
    return ob_get_clean();
}


// --- Main Execution ---
header('Content-Type: application/json; charset=utf-8'); // Default to JSON

try {
    $json_data = file_get_contents('php://input');
    $payload = json_decode($json_data, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON received.');
    }

    if (!isset($payload['type']) || !isset($payload['data'])) {
        throw new Exception('Invalid request payload. Required keys: "type", "data".');
    }

    // Configure mPDF for Japanese.
    // The temporary directory points to 'cache' in the website's root, one level above this script's parent directory.
    $mpdf = new \Mpdf\Mpdf([
        'mode' => 'ja',
        'tempDir' => __DIR__ . '/../../cache',
        'default_font' => 'sans',
        'autoScriptToLang' => true,
        'autoLangToFont' => true,
        'useSubstitutions' => true
    ]);
    
    $mpdf->SetCreator('AI Database Assistant');
    $author = $payload['data']['companyInfo']['companyName'] ?? ($payload['data']['scheduleName'] ?? 'NassenBrothers');
    $mpdf->SetAuthor($author);
    
    // 価格表の場合はHTMLコンテンツを直接使用
    if ($payload['type'] === 'pricing_schedule' && isset($payload['data']['htmlContent'])) {
        $html = $payload['data']['htmlContent'];
    } else {
        $html = generate_pdf_from_data($payload);
    }
    
    $mpdf->WriteHTML($html);

    // Clear any previous headers and set PDF header for browser delivery
    // Remove any previous output that might have been sent
    if (ob_get_level()) {
        ob_end_clean();
    }
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="document.pdf"');
    $mpdf->Output('', 'I'); // 'I' = inline output to browser
    exit;

} catch (Exception $e) {
    http_response_code(500);
    // エラー時は必ずJSONを返す（PDF出力が開始される前）
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'PDF Generation Error: ' . $e->getMessage(),
            'details' => [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]
        ]);
    } else {
        // 既にヘッダーが送信されている場合はログに記録
        error_log('PDF Generation Error: ' . $e->getMessage());
    }
    exit();
}
?>