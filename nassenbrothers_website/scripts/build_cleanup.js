const fs = require('fs');
const path = require('path');

console.log('--- Build Cleanup Script ---');

// 1. Restore development files
const restoreDevFile = (backupPath, activePath) => {
    try {
        console.log(`Restoring ${activePath}...`);
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, activePath);
            console.log(`  Restored: ${backupPath} -> ${activePath}`);
        } else {
             console.warn(`  Warning: Backup file not found, skipping: ${backupPath}`);
        }
    } catch (error) {
        console.error(`  Failed to restore ${activePath}:`, error.message);
    }
};

restoreDevFile('apiService.ts.csv.txt', 'services/apiService.ts');
restoreDevFile('components/Footer.tsx.dev.txt', 'components/Footer.tsx');


// 2. Restore original component files from .dev-backup
try {
    console.log('Restoring original component files from .dev-backup...');
    const componentsDir = 'components';
    const files = fs.readdirSync(componentsDir);

    files.forEach(file => {
        if (file.endsWith('.tsx.dev-backup')) {
            const baseName = file.replace('.tsx.dev-backup', ''); // e.g., 'MyPage'
            const extension = '.tsx';
            
            const backupFile = path.join(componentsDir, file);
            const activeFile = path.join(componentsDir, baseName + extension);
            const magicFile = path.join(componentsDir, baseName + '.magic.txt');

            if (fs.existsSync(activeFile) && fs.existsSync(backupFile)) {
                // Rename active file (which was the magic file) back to its .magic.txt name
                fs.renameSync(activeFile, magicFile);
                console.log(`  Deactivated: ${activeFile} -> ${magicFile}`);
                // Restore original file from backup
                fs.renameSync(backupFile, activeFile);
                console.log(`  Restored: ${backupFile} -> ${activeFile}`);
            } else {
                console.log(`  Skipping cleanup for ${baseName}, backup or active file not found.`);
            }
        }
    });
} catch (error) {
    console.error('  Failed to restore component files:', error.message);
}


console.log('--- Cleanup Complete ---');