<?php
// This file will be renamed to fetch_emails.php on the server.
// It can be triggered by a cron job or a manual request from the frontend.

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php'; // $pdo is available

// --- Security Check (Allow manual trigger from app, but ideally cron is better) ---
// For simplicity, we allow POST requests. In production, you might want to add
// authentication or restrict this to be CLI-only for cron jobs.
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && php_sapi_name() !== 'cli') {
    http_response_code(405);
    die(json_encode(['error' => 'This script can only be triggered via POST request or command line.']));
}

// --- IMAP Helper Functions ---

// Safely decodes MIME header strings (like subject, from)
function decode_mime_header($string) {
    $elements = imap_mime_header_decode($string);
    $text = '';
    for ($i = 0; $i < count($elements); $i++) {
        $charset = $elements[$i]->charset === 'default' ? 'auto' : $elements[$i]->charset;
        $text .= mb_convert_encoding($elements[$i]->text, 'UTF-8', $charset);
    }
    return $text;
}

// Fetches the main body of an email, handling different structures.
function get_body($uid, $imap_stream) {
    $body = '';
    $structure = imap_fetchstructure($imap_stream, $uid, FT_UID);

    if (isset($structure->parts)) { // Multipart
        foreach ($structure->parts as $part_num => $part) {
            if ($part->type == 0 && ($part->subtype == 'PLAIN' || $part->subtype == 'HTML')) {
                $body = imap_fetchbody($imap_stream, $uid, $part_num + 1, FT_UID);
                if ($part->encoding == 3) { // Base64
                    $body = base64_decode($body);
                } elseif ($part->encoding == 4) { // Quoted-Printable
                    $body = quoted_printable_decode($body);
                }
                break; // Found the first text/plain or text/html part
            }
        }
    } else { // Single part
        $body = imap_body($imap_stream, $uid, FT_UID);
    }

    // Convert to UTF-8
    return mb_convert_encoding($body, 'UTF-8', 'auto');
}

// --- Main Logic ---

$results = ['processed_accounts' => 0, 'new_emails' => 0, 'errors' => []];

try {
    // --- 1. Fetch all email accounts from DB ---
    $stmt = $pdo->query("SELECT * FROM email_accounts");
    $accounts = $stmt->fetchAll();

    foreach ($accounts as $account) {
        $results['processed_accounts']++;

        if ($account['account_type'] === 'gmail') {
            // --- Gmail via Google API ---
            // This requires the Google API Client Library for PHP.
            // User must install it via composer: `composer require google/apiclient:^2.0`
            // and have a valid refresh token stored for the account.
            // Due to complexity, this part is provided as a commented-out guide.
            /*
            require_once __DIR__ . '/../../vendor/autoload.php'; // Path to Composer's autoloader

            $client = new Google_Client();
            $client->setClientId($google_settings['CLIENT_ID']);
            $client->setClientSecret($google_settings['CLIENT_SECRET']); // Needs to be stored securely
            $client->setAccessToken(['refresh_token' => $account['google_refresh_token']]);
            $client->fetchAccessTokenWithRefreshToken();
            
            $gmail = new Google_Service_Gmail($client);
            $messages = $gmail->users_messages->listUsersMessages('me', ['q' => 'is:unread']);
            foreach ($messages->getMessages() as $message) {
                $msg = $gmail->users_messages->get('me', $message->getId());
                // ... parse $msg and insert into DB ...
            }
            */
            $results['errors'][] = "Account '{$account['name']}': Gmail fetching is not yet fully implemented in this script.";
            continue;
        
        } elseif ($account['account_type'] === 'standard' && $account['incoming_server_type'] === 'imap') {
            // --- Standard IMAP Account ---
            // The php-imap extension must be enabled on the server for this to work.
            if (!function_exists('imap_open')) {
                $results['errors'][] = "Account '{$account['name']}': php-imap extension is not installed or enabled on the server.";
                continue;
            }
            
            $mailbox = "{{$account['incoming_server_host']}:{$account['incoming_server_port']}/imap" . ($account['incoming_server_ssl'] ? '/ssl' : '') . "}INBOX";
            
            // Suppress warnings from imap_open, handle errors manually
            $imap_stream = @imap_open($mailbox, $account['incoming_server_user'], $account['incoming_server_password']);
            
            if (!$imap_stream) {
                $results['errors'][] = "Account '{$account['name']}': IMAP connection failed: " . imap_last_error();
                continue;
            }

            $search_criteria = 'UNSEEN';
            $uids = imap_search($imap_stream, $search_criteria, SE_UID);

            if ($uids) {
                foreach ($uids as $uid) {
                    $header_info = imap_headerinfo($imap_stream, imap_msgno($imap_stream, $uid));
                    $message_id = $header_info->message_id ?? '<' . uniqid() . '@local>';
                    $message_id_hash = hash('sha254', $message_id);

                    // Check for duplicates
                    $stmt_check = $pdo->prepare("SELECT id FROM emails WHERE account_id = ? AND message_id_hash = ?");
                    $stmt_check->execute([$account['id'], $message_id_hash]);
                    if ($stmt_check->fetch()) {
                        continue; // Skip if email already exists
                    }

                    $from_header = $header_info->from[0];
                    $from_address = $from_header->mailbox . '@' . $from_header->host;
                    $to_address = decode_mime_header($header_info->toaddress);
                    $subject = decode_mime_header($header_info->subject ?? '(No Subject)');
                    $body = get_body($uid, $imap_stream);

                    $email_data = [
                        'id' => 'email_' . time() . '_' . uniqid(),
                        'account_id' => $account['id'],
                        'quote_id' => null, // Cannot be determined at this stage
                        'message_id_hash' => $message_id_hash,
                        'uid' => $uid,
                        'from_address' => $from_address,
                        'to_address' => $to_address,
                        'subject' => $subject,
                        'body' => $body,
                        'sent_at' => date('Y-m-d H:i:s', $header_info->udate),
                        'direction' => 'incoming',
                        'status' => 'received',
                    ];
                    
                    $stmt_insert = $pdo->prepare(
                        "INSERT INTO emails (id, account_id, quote_id, message_id_hash, uid, from_address, to_address, subject, body, sent_at, direction, status)
                         VALUES (:id, :account_id, :quote_id, :message_id_hash, :uid, :from_address, :to_address, :subject, :body, :sent_at, :direction, :status)"
                    );
                    $stmt_insert->execute($email_data);
                    $results['new_emails']++;
                }
            }
            imap_close($imap_stream);
        }
    }

    echo json_encode($results);

} catch (Exception $e) {
    http_response_code(500);
    $results['errors'][] = 'A critical error occurred: ' . $e->getMessage();
    echo json_encode($results);
    exit();
}
?>