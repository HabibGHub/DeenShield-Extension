const fs = require('fs');
const path = require('path');

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

function buildChrome() {
  const buildDir = path.join('build', 'chrome');
  if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });
  ['manifest.json', 'popup.html', 'popup.js', 'background.js', 'polyfill.js'].forEach(f => {
    if (fs.existsSync(f)) copyFileSync(f, buildDir);
  });
  ['LICENSE', 'PRIVACY_POLICY.md'].forEach(f => {
    if (fs.existsSync(f)) copyFileSync(f, buildDir);
  });
  if (fs.existsSync('images')) copyFolderRecursiveSync('images', path.join(buildDir, 'images'));
  console.log('Chrome/Edge build complete:', buildDir);
}

function buildFirefox() {
  const buildDir = path.join('build', 'firefox');
  if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });
  copyFileSync('manifest-v2.json', path.join(buildDir, 'manifest.json'));
  ['popup.html', 'popup.js', 'background-v2.js', 'polyfill.js'].forEach(f => {
    if (fs.existsSync(f)) copyFileSync(f, buildDir);
  });
  ['LICENSE', 'PRIVACY_POLICY.md'].forEach(f => {
    if (fs.existsSync(f)) copyFileSync(f, buildDir);
  });
  if (fs.existsSync('images')) copyFolderRecursiveSync('images', path.join(buildDir, 'images'));
  console.log('Firefox build complete:', buildDir);
}

console.log('Building Deen Shield for all browsers...');
buildChrome();
buildFirefox();
console.log('All builds complete!');
console.log('- Chrome/Edge: build/chrome/');
console.log('- Firefox: build/firefox/');
