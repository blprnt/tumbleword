#!/bin/bash
# Run this script once from the project root to download all external assets locally.
set -e

VIEWS=views

echo "Creating directories..."
mkdir -p "$VIEWS/img" "$VIEWS/fonts"

echo "Downloading favicons..."
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/favicon.ico" -o "$VIEWS/favicon.ico"
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/apple-touch-icon.png" -o "$VIEWS/apple-touch-icon.png"
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/favicon-32x32.png" -o "$VIEWS/favicon-32x32.png"
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/favicon-16x16.png" -o "$VIEWS/favicon-16x16.png"

echo "Downloading help GIFs..."
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/WordWorm.gif?v=1670611810665" -o "$VIEWS/img/WordWorm.gif"
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/WormWarm.gif?v=1670611810331" -o "$VIEWS/img/WormWarm.gif"
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/CaviarAviary.gif?v=1670710430542" -o "$VIEWS/img/CaviarAviary.gif"

echo "Downloading tumbleweed SVGs..."
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/tumbleweed_simple.svg?v=1670603043635" -o "$VIEWS/img/tumbleweed_simple.svg"
curl -sL "https://cdn.glitch.global/fddfe4f6-ba40-4230-a637-350cbd5ad40f/tumbleweed_fill.svg?v=1670963018347" -o "$VIEWS/img/tumbleweed_fill.svg"

echo "Downloading p5.js libraries..."
curl -sL "https://cdn.jsdelivr.net/npm/p5@1.3.0/lib/p5.js" -o "$VIEWS/p5.js"
curl -sL "https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.6.0/addons/p5.dom.js" -o "$VIEWS/p5.dom.js"

echo "Downloading Martian Mono font..."
curl -sL "https://fonts.gstatic.com/s/martianmono/v6/2V08KIcADoYhV6w87xrTKjs4CYElh_VS9YA4TlTnQzaVMIE6j15dYY3qu86W.ttf" -o "$VIEWS/fonts/MartianMono-ExtraLight.ttf"

echo "Done! All assets downloaded."
