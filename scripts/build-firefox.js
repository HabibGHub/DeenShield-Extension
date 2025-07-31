const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyFileSync(source, target) {
  let targetFile = target;
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }
  fs.copyFileSync(source, targetFile);
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  fs.readdirSync(source).forEach(file => {
    const curSource = path.join(source, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, path.join(target, file));
    } else {
      copyFileSync(curSource, target);
    }
  });
}

console.log('=============================================');
console.log(' Building Deen Shield for Firefox Add-ons');
console.log('=============================================');

const buildDir = path.join('build', 'firefox');
const distDir = 'dist';

if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
fs.mkdirSync(buildDir, { recursive: true });

console.log('[1/5] Copying core files...');
copyFileSync('manifest-v2.json', path.join(buildDir, 'manifest.json'));
['popup.html', 'popup.js', 'background-v2.js', 'polyfill.js'].forEach(f => {
  if (fs.existsSync(f)) copyFileSync(f, buildDir);
});

console.log('[2/5] Copying documentation...');
['LICENSE', 'PRIVACY_POLICY.md'].forEach(f => {
  if (fs.existsSync(f)) copyFileSync(f, buildDir);
});

console.log('[3/5] Copying images...');
if (fs.existsSync('images')) copyFolderRecursiveSync('images', path.join(buildDir, 'images'));

console.log('[4/5] Validating manifest...');
// (Add manifest validation if needed)

console.log('[5/5] Creating distribution package...');
const zipName = path.join(distDir, 'deen-shield-firefox-v1.1.0.zip');
try {
  execSync(`powershell Compress-Archive -Path ${buildDir}/* -DestinationPath ${zipName} -Force`, { stdio: 'inherit' });
} catch (e) {
  console.error('Error creating zip:', e.message);
}

console.log('=============================================');
console.log(' Firefox Add-ons Build Complete!');
console.log('=============================================');
console.log('Build location:', buildDir);
console.log('Package location:', zipName);
