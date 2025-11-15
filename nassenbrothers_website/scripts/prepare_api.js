const fs = require('fs');
const path = require('path');

const apiSourceDir = 'api';
const distApiDir = 'dist/api';

const filesToCopy = [
    'app-data.php.txt',
    'dashboard-data.php.txt',
    'dashboard-analytics.php.txt',
    'db_connect.php.txt',
    'fetch_url.php.txt',
    'generate_pdf.php.txt',
    'my-page-data.php.txt',
    'quote-actions.php.txt',
    'save_articles.php.txt',
    'save_gallery_images.php.txt',
    'save_quote.php.txt',
    'save_ui_text.php.txt',
    'send_mail.php.txt',
    'sitemap.php.txt',
    'update-customer.php.txt',
    'addresses.php.txt',
    'save_theme_settings.php.txt',
    'save_article_tags.php.txt',
    'save_gallery_tags.php.txt',
    'upload_image.php.txt',
    'upload_base64_image.php.txt',
    'upload_asset.php.txt',
    'save_site_assets.php.txt',
    'delete_asset.php.txt',
    'gemini_proxy.php.txt',
    'save_pages_content.php.txt',
    'login-request.php.txt',
    'login-verify.php.txt',
    'services/gemini_service.php.txt',
    // ADD: Add new log-related API files
    'log_error.php.txt',
    'get_logs.php.txt',
    'clear_logs.php.txt'
];

try {
    // Ensure dist/api exists
    if (!fs.existsSync(distApiDir)) {
        fs.mkdirSync(distApiDir, { recursive: true });
        console.log(`Created directory: ${distApiDir}`);
    }

    // Copy PHP files, removing the .txt extension and ensuring subdirectories are created.
    filesToCopy.forEach(file => {
        const sourcePath = path.join(apiSourceDir, file);
        const destPath = path.join(distApiDir, file.replace('.txt', ''));

        // Ensure the destination directory for the file exists.
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
            console.log(`Created subdirectory: ${destDir}`);
        }

        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            console.log(`Copied: ${sourcePath} -> ${destPath}`);
        } else {
            console.warn(`Warning: Source file not found, skipping: ${sourcePath}`);
        }
    });

    // Copy PHPMailer directory
    const phpMailerSource = path.join(apiSourceDir, 'PHPMailer');
    const phpMailerDest = path.join(distApiDir, 'PHPMailer');
    if (fs.existsSync(phpMailerSource)) {
        fs.cpSync(phpMailerSource, phpMailerDest, { recursive: true });
        console.log(`Copied directory: ${phpMailerSource} -> ${phpMailerDest}`);
    } else {
         console.warn(`Warning: PHPMailer directory not found, skipping: ${phpMailerSource}`);
    }

    // Copy .htaccess
    const htaccessSource = 'htaccess.txt';
    const htaccessDest = path.join('dist', '.htaccess');
    if (fs.existsSync(htaccessSource)) {
        fs.copyFileSync(htaccessSource, htaccessDest);
        console.log(`Copied: ${htaccessSource} -> ${htaccessDest}`);
    } else {
        console.warn(`Warning: htaccess.txt not found, skipping.`);
    }

    console.log('API files prepared successfully.');
} catch (error) {
    console.error('Error preparing API files:', error);
    process.exit(1);
}