<?php
// Xserver Cron Job for Database Backup
// This file should be placed in your project's 'api' directory on the server.
// Rename this file from 'backup_database.php.txt' to 'backup_database.php'.
// CRON COMMAND (e.g., every hour): 0 * * * * /usr/bin/php /home/your_server_id/your_domain/public_html/api/backup_database.php

// --- Security Check: Ensure this script is run from the command line (cron) ---
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die("Forbidden: This script is only accessible from the command line.");
}

echo "Cron job started at " . date('Y-m-d H:i:s') . "\n";

// --- Function to read server configuration from CSV ---
function read_server_config($filePath) {
    if (!file_exists($filePath)) {
        throw new Exception("Configuration file not found at: {$filePath}");
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
    
    $required_keys = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    foreach ($required_keys as $key) {
        if (!isset($config[$key])) {
             throw new Exception("Required configuration key '{$key}' is missing.");
        }
    }
    return $config;
}


try {
    // --- 1. Load Database Configuration ---
    $config = read_server_config(__DIR__ . '/../templates/server_config.csv');
    $db_host = $config['DB_HOST'];
    $db_name = $config['DB_NAME'];
    $db_user = $config['DB_USER'];
    $db_pass = $config['DB_PASSWORD'];

    // --- 2. Connect to Database to get backup settings ---
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("SELECT `key`, `value` FROM `settings` WHERE `key` IN ('BACKUP_ENABLED', 'BACKUP_HOUR', 'BACKUP_RETENTION_DAYS')");
    $settings_raw = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $is_enabled = ($settings_raw['BACKUP_ENABLED'] ?? 'false') === 'true';
    $backup_hour = (int)($settings_raw['BACKUP_HOUR'] ?? 2); // Default to 2 AM
    $retention_days = (int)($settings_raw['BACKUP_RETENTION_DAYS'] ?? 14); // Default to 14 days
    
    echo "Loaded settings: Enabled=" . ($is_enabled ? 'Yes' : 'No') . ", Hour={$backup_hour}, Retention={$retention_days} days\n";

    // --- 3. Check if backup should run now ---
    if (!$is_enabled) {
        echo "Auto backup is disabled in settings. Exiting.\n";
        exit(0);
    }

    $current_hour = (int)date('G');
    if ($current_hour !== $backup_hour) {
        echo "Current hour ({$current_hour}) does not match scheduled backup hour ({$backup_hour}). Exiting.\n";
        exit(0);
    }
    
    // Path to the directory where backups will be stored.
    $backup_dir = __DIR__ . '/../../database_backups';
    
    // Check if a backup for today already exists
    $date_today = date('Y-m-d');
    $todays_backup_pattern = $backup_dir . "/{$db_name}-backup-{$date_today}*.sql.gz";
    if (glob($todays_backup_pattern)) {
        echo "A backup for today already exists. Exiting.\n";
        exit(0);
    }
    
    echo "Conditions met. Starting database backup...\n";
    
    // --- 4. Prepare Backup Directory ---
    if (!is_dir($backup_dir)) {
        if (!mkdir($backup_dir, 0755, true)) {
            throw new Exception("Failed to create backup directory: {$backup_dir}");
        }
        echo "Created backup directory: {$backup_dir}\n";
    }

    // --- 5. Create Backup ---
    $date_time = date('Y-m-d_H-i-s');
    $backup_file_name = "{$db_name}-backup-{$date_time}.sql.gz";
    $backup_file_path = $backup_dir . '/' . $backup_file_name;

    // Use escapeshellarg to prevent command injection vulnerabilities
    $command = sprintf(
        'mysqldump --host=%s --user=%s --password=%s %s | gzip > %s',
        escapeshellarg($db_host),
        escapeshellarg($db_user),
        escapeshellarg($db_pass),
        escapeshellarg($db_name),
        escapeshellarg($backup_file_path)
    );
    
    $output = null;
    $return_var = null;
    exec($command, $output, $return_var);

    if ($return_var !== 0) {
        throw new Exception("mysqldump command failed. Return code: {$return_var}.");
    }
    
    if (!file_exists($backup_file_path) || filesize($backup_file_path) === 0) {
        throw new Exception("Backup file was not created or is empty.");
    }
    
    echo "Successfully created backup: {$backup_file_path}\n";

    // --- 6. Clean Up Old Backups ---
    echo "Cleaning up old backups (older than {$retention_days} days)...\n";
    $files = glob($backup_dir . '/*.sql.gz');
    $now = time();
    $deleted_count = 0;

    foreach ($files as $file) {
        if (is_file($file)) {
            if ($now - filemtime($file) >= $retention_days * 24 * 60 * 60) {
                if (unlink($file)) {
                    echo "  - Deleted old backup: " . basename($file) . "\n";
                    $deleted_count++;
                } else {
                    echo "  - WARNING: Failed to delete old backup: " . basename($file) . "\n";
                }
            }
        }
    }
    if ($deleted_count === 0) {
        echo "  - No old backups to delete.\n";
    }
    
    echo "Backup process completed successfully.\n";

} catch (Exception $e) {
    echo "\n\nERROR: An error occurred during the backup process.\n";
    echo "Message: " . $e->getMessage() . "\n";
    exit(1);
}

exit(0);