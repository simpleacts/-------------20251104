<?php
// This file will be renamed to send_mail.php on the server.

header('Content-Type: application/json; charset=utf-8');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Assuming PHPMailer is installed in the 'api/PHPMailer' directory.
// The user should ensure these files are present on the server.
require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

// --- Config reader function ---
function read_mail_config($filePath) {
    if (!file_exists($filePath)) {
        throw new Exception("Configuration file not found at: {$filePath}.");
    }
    $config = [];
    if (($handle = fopen($filePath, "r")) !== FALSE) {
        fgetcsv($handle); // Skip header row
        while (($data = fgetcsv($handle)) !== FALSE) {
            if (count($data) === 2) {
                $config[$data[0]] = $data[1];
            }
        }
        fclose($handle);
    }
    // Return all mail-related settings
    return [
        'from_address' => $config['MAIL_FROM_ADDRESS'] ?? 'noreply@example.com',
        'from_name'    => $config['MAIL_FROM_NAME'] ?? 'System',
        'smtp_host'    => $config['SMTP_HOST'] ?? '',
        'smtp_user'    => $config['SMTP_USER'] ?? '',
        'smtp_pass'    => $config['SMTP_PASSWORD'] ?? '',
        'smtp_port'    => (int)($config['SMTP_PORT'] ?? 587),
        'smtp_secure'  => ($config['SMTP_SECURE'] ?? 'true') === 'true' ? PHPMailer::ENCRYPTION_STARTTLS : '',
    ];
}

// --- Main Logic ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is accepted.']);
    exit();
}

$json_data = file_get_contents('php://input');
$request = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($request['type']) || !isset($request['email']) || !isset($request['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload. Required fields: "type", "email", "data".']);
    exit();
}

$mail = new PHPMailer(true);

try {
    $mail_config = read_mail_config(__DIR__ . '/../templates/server_config.csv');

    $to = $request['email'];
    $data = $request['data'];
    $subject = '';
    $body = '';
    $from_address = $data['from_address'] ?? $mail_config['from_address'];
    $from_name = $data['from_name'] ?? $mail_config['from_name'];
    $quote_id = $data['quote_id'] ?? null;
    $account_id = $data['account_id'] ?? null;
    $attachments = $data['attachments'] ?? [];


    if ($request['type'] === 'general_compose') {
        $subject = $data['subject'];
        $body = $data['body'];
        if (strip_tags($body) != $body) {
            $mail->isHTML(true);
        }
    } else {
        $customer_name = !empty($data['customerInfo']['companyName']) ? $data['customerInfo']['companyName'] : $data['customerInfo']['nameKanji'];
        $estimate_id = $data['estimateId'] ?? 'N/A';
        $total_cost = isset($data['cost']['totalCostWithTax']) ? number_format($data['cost']['totalCostWithTax']) : 'N/A';

        if ($request['type'] === 'estimate') {
            $subject = "【{$from_name}】お見積もりのご案内 ({$estimate_id})";
            $body = "{$customer_name} 様\n\nこの度は、お見積もりのご依頼をいただき、誠にありがとうございます。\n以下の内容でお見積もりを作成いたしましたので、ご確認ください。\n\n----------------------------------------\nお見積もり番号： {$estimate_id}\nお見積もり金額（税込）： ¥{$total_cost}\n----------------------------------------\n\nご不明な点がございましたら、お気軽にお問い合わせください。\nご検討のほど、よろしくお願い申し上げます。\n\n※このメールは送信専用です。\n\n========================================\n{$from_name}\n========================================";
        } elseif ($request['type'] === 'invoice') {
            $payment_due_date = $data['paymentDueDate'] ?? '別途ご案内';
            $subject = "【{$from_name}】ご請求書発行のお知らせ ({$estimate_id})";
            $body = "{$customer_name} 様\n\n平素は格別のご高配を賜り、厚く御礼申し上げます。\nご注文いただきました件につきまして、下記の通りご請求申し上げます。\n\n----------------------------------------\nご注文番号： {$estimate_id}\nご請求金額（税込）： ¥{$total_cost}\nお支払い期限: {$payment_due_date}\n----------------------------------------\n\nお忙しいところ恐れ恐れ入りますが、ご確認の上、お支払い手続きをお願いいたします。\n\n※このメールは送信専用です。\n\n========================================\n{$from_name}\n========================================";
        } elseif ($request['type'] === 'shipping_notification') {
            $shipping_carrier = $data['shipping_carrier'] ?? 'N/A';
            $tracking_number = $data['tracking_number'] ?? 'N/A';
            
            $subject = "【{$from_name}】ご注文商品の発送のお知らせ ({$estimate_id})";
            $body = "{$customer_name} 様\n\nこの度は、ご注文いただき誠にありがとうございます。\nご注文の商品を発送いたしましたので、お知らせいたします。\n\n----------------------------------------\nご注文番号： {$estimate_id}\n配送会社： {$shipping_carrier}\nお問い合わせ伝票番号： {$tracking_number}\n----------------------------------------\n\n商品の到着まで、今しばらくお待ちくださいませ。\n\n※配送状況の確認は、各配送会社のウェブサイトから上記伝票番号をご利用ください。\n※このメールは送信専用です。\n\n========================================\n{$from_name}\n========================================";
        } else {
            throw new Exception("Unsupported mail type: " . $request['type']);
        }
    }
    
    // Server settings
    $mail->isSMTP();
    $mail->Host       = $mail_config['smtp_host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $mail_config['smtp_user'];
    $mail->Password   = $mail_config['smtp_pass'];
    $mail->SMTPSecure = $mail_config['smtp_secure'];
    $mail->Port       = $mail_config['smtp_port'];
    $mail->CharSet    = 'UTF-8';

    // Recipients
    $mail->setFrom($from_address, $from_name);
    $mail->addAddress($to);
    $mail->addReplyTo($from_address, $from_name);

    // Attachments
    foreach ($attachments as $attachment) {
        $mail->addStringAttachment(
            base64_decode($attachment['base64_data']),
            $attachment['filename'],
            'base64',
            $attachment['file_type']
        );
    }

    // Content
    $mail->Subject = $subject;
    $mail->Body    = $body;
    if ($mail->isHTML()) {
        $mail->AltBody = strip_tags(str_replace('<br>', "\n", $body));
    }


    $mail->send();
    
    // If mail sending is successful, log it to the database
    require_once 'db_connect.php'; // $pdo is available

    $email_id = 'email_' . time() . '_' . uniqid();

    $stmt = $pdo->prepare(
        "INSERT INTO emails (id, account_id, quote_id, from_address, to_address, subject, body, sent_at, direction, status)
         VALUES (:id, :account_id, :quote_id, :from_address, :to_address, :subject, :body, :sent_at, :direction, :status)"
    );

    $stmt->execute([
        ':id' => $email_id,
        ':account_id' => $account_id,
        ':quote_id' => $quote_id,
        ':from_address' => $from_address,
        ':to_address' => $to,
        ':subject' => $subject,
        ':body' => $body,
        ':sent_at' => date('Y-m-d H:i:s'),
        ':direction' => 'outgoing',
        ':status' => 'sent'
    ]);

    if (count($attachments) > 0) {
        $stmt_attach = $pdo->prepare(
            "INSERT INTO email_attachments (id, email_id, filename, file_type, file_size, base64_data)
             VALUES (:id, :email_id, :filename, :file_type, :file_size, :base64_data)"
        );
        foreach ($attachments as $attachment) {
            $stmt_attach->execute([
                ':id' => 'attach_' . time() . '_' . uniqid() . rand(100,999),
                ':email_id' => $email_id,
                ':filename' => $attachment['filename'],
                ':file_type' => $attachment['file_type'],
                ':file_size' => $attachment['file_size'],
                ':base64_data' => $attachment['base64_data']
            ]);
        }
    }


    echo json_encode(['success' => true, 'message' => 'Mail sent successfully via PHPMailer and logged.']);


} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => "Message could not be sent. Mailer Error: {$mail->ErrorInfo} | General Error: {$e->getMessage()}"]);
    exit();
}
?>