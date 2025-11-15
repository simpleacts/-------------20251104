<?php
// This file will be renamed to db_connect.php on the server.

// Suppress error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);

/**
 * Reads server configuration from a key-value CSV file.
 * @param string $filePath The path to the CSV configuration file.
 * @return array The configuration array with database credentials.
 * @throws Exception If the file is not found or cannot be read, or if keys are missing.
 */
function read_server_config($filePath) {
    if (!file_exists($filePath)) {
        throw new Exception("Configuration file not found at: {$filePath}. Please ensure 'templates/server_config.csv' exists and is readable.");
    }
    
    $config = [];
    // Use @ to suppress fopen warnings and handle the error manually for a cleaner response.
    $handle = @fopen($filePath, "r");
    if ($handle === FALSE) {
        throw new Exception("Configuration file could not be opened at: {$filePath}. Please check file permissions.");
    }
    
    fgetcsv($handle, 0, ',', '"', '\\'); // Skip header row
    while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
        // Gracefully skip malformed rows (not exactly key-value pairs)
        if (count($data) === 2) {
            $config[$data[0]] = $data[1];
        }
    }
    fclose($handle);

    $dbConfig = [
        'db_host' => $config['DB_HOST'] ?? null,
        'db_name' => $config['DB_NAME'] ?? null,
        'db_user' => $config['DB_USER'] ?? null,
        'db_password' => $config['DB_PASSWORD'] ?? null
    ];
    
    // Check for required keys and build a specific error message for clarity.
    $missingKeys = [];
    if (empty($dbConfig['db_host'])) $missingKeys[] = 'DB_HOST';
    if (empty($dbConfig['db_name'])) $missingKeys[] = 'DB_NAME';
    if (empty($dbConfig['db_user'])) $missingKeys[] = 'DB_USER';
    // DB_PASSWORD can be empty for some local setups.
    
    if (!empty($missingKeys)) {
        throw new Exception(
            "Could not read valid DB configuration from: {$filePath}. The following required keys are missing or empty: " . 
            implode(', ', $missingKeys) . ". Please check the file."
        );
    }

    return $dbConfig;
}

try {
    // Check if PDO extension is available
    if (!extension_loaded('pdo')) {
        throw new Exception('PDO extension is not loaded. Please install php-pdo package.');
    }
    
    // Check if PDO MySQL driver is available
    $availableDrivers = PDO::getAvailableDrivers();
    if (!in_array('mysql', $availableDrivers)) {
        $driversList = empty($availableDrivers) ? 'none' : implode(', ', $availableDrivers);
        throw new Exception(
            'PDO MySQL driver is not available. ' .
            'Available drivers: ' . $driversList . '. ' .
            'Please install php-pdo-mysql package (or php-mysql on some systems).'
        );
    }
    
    // Build a robust path to the config file, which is in the parent directory of `api`.
    $config = read_server_config(__DIR__ . '/../templates/server_config.csv');

    define('DB_HOST', $config['db_host']);
    define('DB_NAME', $config['db_name']);
    define('DB_USER', $config['db_user']);
    define('DB_PASSWORD', $config['db_password']);
    define('DB_CHARSET', 'utf8mb4');

    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);

} catch (PDOException $e) {
    http_response_code(500);
    // Check for specific PDO errors
    $errorMessage = $e->getMessage();
    if (strpos($errorMessage, 'could not find driver') !== false) {
        $availableDrivers = extension_loaded('pdo') ? PDO::getAvailableDrivers() : [];
        $driversList = empty($availableDrivers) ? 'none' : implode(', ', $availableDrivers);
        $errorMessage = 'PDO MySQL driver is not available. ' .
            'Available drivers: ' . $driversList . '. ' .
            'Please install php-pdo-mysql package (or php-mysql on some systems).';
    }
    // Return a JSON error message so the frontend can display it for debugging.
    echo json_encode(['error' => 'Database setup failed: ' . $errorMessage]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    // Return a JSON error message so the frontend can display it for debugging.
    echo json_encode(['error' => 'Database setup failed: ' . $e->getMessage()]);
    exit();
}

// The $pdo object is now available to any script that includes this file.
?>