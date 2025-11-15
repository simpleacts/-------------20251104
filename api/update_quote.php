<?php
// This file will be renamed to update_quote.php on the server.

header('Content-Type: application/json; charset=utf-8');

require_once 'db_connect.php'; // $pdo is now available

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is accepted.']);
    exit();
}

$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data['table']) || !isset($data['operations']) || !is_array($data['operations'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload. Required fields: "table", "operations" (array).']);
    exit();
}

$table_name = $data['table'];
$operations = $data['operations'];

// This endpoint is specialized for quotes and related tables.
$allowed_tables = ['quotes', 'quote_history']; // Add other related tables if needed

if (!in_array($table_name, $allowed_tables)) {
    http_response_code(403);
    echo json_encode(['error' => "This endpoint does not support the '{$table_name}' table."]);
    exit();
}

try {
    $pdo->beginTransaction();

    foreach ($operations as $op) {
        $type = $op['type'] ?? null;
        
        // --- Fetch original data for history logging (for UPDATE on quotes) ---
        $original_data = null;
        if ($type === 'UPDATE' && $table_name === 'quotes' && !empty($op['where'])) {
            $where_parts_hist = [];
            foreach (array_keys($op['where']) as $col) { $where_parts_hist[] = "`{$col}` = ?"; }
            $stmt_hist = $pdo->prepare("SELECT * FROM `quotes` WHERE " . implode(' AND ', $where_parts_hist) . " LIMIT 1");
            $stmt_hist->execute(array_values($op['where']));
            $original_data = $stmt_hist->fetch();
        }

        switch ($type) {
            case 'INSERT':
                if (empty($op['data'])) continue 2;
                $columns = array_keys($op['data']);
                $placeholders = array_map(function($c) { return ":$c"; }, $columns);
                $sql = "INSERT INTO `{$table_name}` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $placeholders) . ")";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($op['data']);
                break;

            case 'UPDATE':
                if (empty($op['data']) || empty($op['where'])) continue 2;
                $set_parts = [];
                foreach (array_keys($op['data']) as $col) { $set_parts[] = "`{$col}` = :data_{$col}"; }
                $where_parts = [];
                foreach (array_keys($op['where']) as $col) { $where_parts[] = "`{$col}` = :where_{$col}"; }
                $sql = "UPDATE `{$table_name}` SET " . implode(', ', $set_parts) . " WHERE " . implode(' AND ', $where_parts);
                $params = [];
                foreach($op['data'] as $key => $val) $params[":data_{$key}"] = $val;
                foreach($op['where'] as $key => $val) $params[":where_{$key}"] = $val;
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                // --- Log to quote_history ---
                if ($table_name === 'quotes' && $original_data) {
                    $details = [];
                    foreach($op['data'] as $key => $new_value) {
                        if (array_key_exists($key, $original_data) && $original_data[$key] != $new_value) {
                             $details[] = [
                                 'field' => $key,
                                 'old' => $original_data[$key],
                                 'new' => $new_value
                             ];
                        }
                    }
                    if (!empty($details)) {
                        $hist_stmt = $pdo->prepare("INSERT INTO `quote_history` (`quote_id`, `user_id`, `action`, `details`, `created_at`) VALUES (:quote_id, :user_id, :action, :details, NOW())");
                        $hist_stmt->execute([
                            ':quote_id' => $original_data['id'],
                            ':user_id' => 0, // Assuming 0 for system/admin user
                            ':action' => 'UPDATE',
                            ':details' => json_encode($details)
                        ]);
                    }
                }
                break;

            case 'DELETE':
                // Note: Deleting from quote_history is probably not a desired feature.
                if ($table_name === 'quote_history') {
                    throw new Exception("Deleting from quote_history is not permitted.");
                }
                if (empty($op['where'])) continue 2;
                $where_parts = [];
                foreach (array_keys($op['where']) as $col) { $where_parts[] = "`{$col}` = :{$col}"; }
                $sql = "DELETE FROM `{$table_name}` WHERE " . implode(' AND ', $where_parts);
                $stmt = $pdo->prepare($sql);
                $stmt->execute($op['where']);
                break;

            default:
                throw new Exception("Invalid operation type: {$type}");
        }
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Quote data updated successfully.']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database update failed: ' . $e->getMessage()]);
    exit();
}
?>