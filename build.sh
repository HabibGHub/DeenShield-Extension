#!/bin/bash

# Cross-platform build script for Deen Shield extension

echo "Building Deen Shield for all browsers..."

# Create build directories
mkdir -p build/chrome
mkdir -p build/firefox
mkdir -p build/safari

# Build for Chrome/Edge (Manifest V3)
echo "Building for Chrome/Edge..."
cp manifest.json build/chrome/
cp popup.html build/chrome/
cp popup.js build/chrome/
cp background.js build/chrome/
cp polyfill.js build/chrome/

# Build for Firefox (Manifest V2)
echo "Building for Firefox..."
cp manifest-v2.json build/firefox/manifest.json
cp popup.html build/firefox/
cp popup.js build/firefox/
cp background-v2.js build/firefox/background.js
cp polyfill.js build/firefox/

# Build for Safari
echo "Building for Safari..."
cp manifest.json build/safari/
cp popup.html build/safari/
cp popup.js build/safari/
cp background.js build/safari/
cp polyfill.js build/safari/
cp safari-content.js build/safari/

# Copy images if they exist
if [ -d "images" ]; then
    cp -r images build/chrome/
    cp -r images build/firefox/
    cp -r images build/safari/
fi

echo "All builds complete!"
echo "- Chrome/Edge: build/chrome/"
echo "- Firefox: build/firefox/"
echo "- Safari: build/safari/"