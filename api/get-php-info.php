<?php
// This file will be renamed to get-php-info.php on the server.
header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Get basic PHP version
    $php_version = phpversion();

    // 2. Get all ini settings
    $ini_settings = ini_get_all();
    
    // 3. Get loaded extensions
    $loaded_extensions = get_loaded_extensions();

    // 4. Capture phpinfo() HTML output
    ob_start();
    phpinfo();
    $phpinfo_html = ob_get_clean();

    // Sanitize phpinfo HTML to be embeddable in JSON
    // Remove DOCTYPE, html, head, body tags to avoid full page structure issues
    $phpinfo_html = preg_replace('/^<!DOCTYPE.+?>/is', '', $phpinfo_html);
    $phpinfo_html = preg_replace('/<html.+?>/is', '', $phpinfo_html);
    $phpinfo_html = preg_replace('/<head.+?<\/head>/is', '', $phpinfo_html);
    $phpinfo_html = preg_replace('/<body.+?>/is', '', $phpinfo_html);
    $phpinfo_html = preg_replace('/<\/body><\/html>/is', '', $phpinfo_html);
    
    // Create a style block for the phpinfo content to ensure it's readable
    $phpinfo_styles = "
        <style>
            .phpinfo .e { background-color: #ccf; font-weight: bold; color: #000; }
            .phpinfo .v { background-color: #ddd; color: #000; }
            .phpinfo .h { background-color: #99c; font-weight: bold; color: #000; }
            .phpinfo table { border-collapse: collapse; width: 100%; }
            .phpinfo td, .phpinfo th { border: 1px solid #666; font-size: 0.9em; vertical-align: baseline; padding: 4px 5px; }
        </style>
    ";

    // 5. Combine all information into a single JSON response
    $response_data = [
        'php_version' => $php_version,
        'loaded_extensions' => $loaded_extensions,
        'ini_settings' => $ini_settings,
        'phpinfo_html' => $phpinfo_styles . '<div class="phpinfo">' . $phpinfo_html . '</div>'
    ];

    echo json_encode($response_data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to get PHP info: ' . $e->getMessage()]);
    exit();
}
?>