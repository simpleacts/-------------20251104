const fs = require('fs');
const path = require('path');

// Helper function to copy directories recursively
const copyDirRecursive = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

console.log('Preparing static assets for CSV build...');

// --- 1. Copy 'templates' directory ---
const templatesSrcDir = 'templates';
const templatesDestDir = 'dist/templates';
if (fs.existsSync(templatesSrcDir)) {
    copyDirRecursive(templatesSrcDir, templatesDestDir);
    console.log(`  Copied directory: ${templatesSrcDir} -> ${templatesDestDir}`);
} else {
    console.log(`  "${templatesSrcDir}" directory not found, skipping.`);
}

// --- 2. Copy contents of 'public' directory ---
const publicSrcDir = 'public';
const distDir = 'dist';
if (fs.existsSync(publicSrcDir)) {
    const items = fs.readdirSync(publicSrcDir, { withFileTypes: true });
    for (const item of items) {
        const srcPath = path.join(publicSrcDir, item.name);
        const destPath = path.join(distDir, item.name);
        if (item.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
        console.log(`  Copied asset: ${srcPath} -> ${destPath}`);
    }
} else {
    console.log(`  "${publicSrcDir}" directory not found, skipping.`);
}

// --- 3. Copy .htaccess for static build to handle SPA routing ---
const htaccessSource = 'htaccess.txt';
const htaccessDest = path.join(distDir, '.htaccess');
if (fs.existsSync(htaccessSource)) {
    fs.copyFileSync(htaccessSource, htaccessDest);
    console.log(`  Copied routing file: ${htaccessSource} -> ${htaccessDest}`);
} else {
    console.warn(`  Warning: ${htaccessSource} not found, skipping for static build.`);
}

console.log('Static assets prepared successfully.');
